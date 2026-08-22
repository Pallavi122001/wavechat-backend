import { prisma } from '../../config/db';
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from '../../utils/errors';

export class ContactsService {
  static async getContacts(userId: string) {
    const contacts = await prisma.contact.findMany({
      where: {
        OR: [
          { userId },
          { contactUserId: userId },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            bio: true,
            status: true,
            lastSeenAt: true,
          },
        },
        contactUser: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            bio: true,
            status: true,
            lastSeenAt: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return contacts.map((c) => {
      const isInitiator = c.userId === userId;
      const contactPerson = isInitiator ? c.contactUser : c.user;
      return {
        id: c.id,
        status: c.status,
        isInitiator,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        contactUser: contactPerson,
      };
    });
  }

  static async sendRequest(userId: string, contactUserId: string) {
    if (userId === contactUserId) {
      throw new BadRequestError('Cannot add yourself as a contact');
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: contactUserId },
    });

    if (!targetUser) {
      throw new NotFoundError('Target user not found');
    }

    const existingContact = await prisma.contact.findFirst({
      where: {
        OR: [
          { userId, contactUserId },
          { userId: contactUserId, contactUserId: userId },
        ],
      },
    });

    if (existingContact) {
      if (existingContact.status === 'ACCEPTED') {
        throw new ConflictError('User is already in your contacts');
      }
      if (existingContact.status === 'PENDING') {
        throw new ConflictError('Contact request already exists or is pending');
      }
      if (existingContact.status === 'BLOCKED') {
        throw new ForbiddenError('Contact request cannot be sent');
      }
    }

    const contact = await prisma.contact.create({
      data: {
        userId,
        contactUserId,
        status: 'PENDING',
      },
      include: {
        contactUser: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            bio: true,
            status: true,
            lastSeenAt: true,
          },
        },
      },
    });

    return contact;
  }

  static async acceptRequest(userId: string, id: string) {
    let contact = await prisma.contact.findUnique({
      where: { id },
    });

    if (!contact) {
      contact = await prisma.contact.findFirst({
        where: {
          userId: id,
          contactUserId: userId,
          status: 'PENDING',
        },
      });
    }

    if (!contact) {
      throw new NotFoundError('Contact request not found');
    }

    if (contact.contactUserId !== userId) {
      throw new ForbiddenError('You can only accept contact requests sent to you');
    }

    if (contact.status === 'ACCEPTED') {
      return contact;
    }

    const updatedContact = await prisma.contact.update({
      where: { id: contact.id },
      data: { status: 'ACCEPTED' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            bio: true,
            status: true,
            lastSeenAt: true,
          },
        },
        contactUser: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            bio: true,
            status: true,
            lastSeenAt: true,
          },
        },
      },
    });

    return updatedContact;
  }
}
