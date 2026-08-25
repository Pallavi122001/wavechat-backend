import { Contact, User } from '../../models';
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from '../../utils/errors';

export class ContactsService {
  static async getContacts(userId: string) {
    const contacts = await Contact.find({
      $or: [{ userId }, { contactUserId: userId }],
    })
      .populate({
        path: 'userId',
        select: '_id name email avatarUrl bio status lastSeenAt',
      })
      .populate({
        path: 'contactUserId',
        select: '_id name email avatarUrl bio status lastSeenAt',
      })
      .sort({ updatedAt: -1 })
      .lean();

    return contacts.map((c: any) => {
      const isInitiator = c.userId?._id === userId || c.userId === userId;
      const rawContactUser = isInitiator ? c.contactUserId : c.userId;
      
      const contactUser = typeof rawContactUser === 'object' && rawContactUser !== null
        ? {
            id: rawContactUser._id,
            name: rawContactUser.name,
            email: rawContactUser.email,
            avatarUrl: rawContactUser.avatarUrl,
            bio: rawContactUser.bio,
            status: rawContactUser.status,
            lastSeenAt: rawContactUser.lastSeenAt,
          }
        : null;

      return {
        id: c._id,
        status: c.status,
        isInitiator,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        contactUser,
      };
    });
  }

  static async sendRequest(userId: string, contactUserId: string) {
    if (userId === contactUserId) {
      throw new BadRequestError('Cannot add yourself as a contact');
    }

    const targetUser = await User.findById(contactUserId);

    if (!targetUser) {
      throw new NotFoundError('Target user not found');
    }

    const existingContact = await Contact.findOne({
      $or: [
        { userId, contactUserId },
        { userId: contactUserId, contactUserId: userId },
      ],
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

    const newContact = await Contact.create({
      userId,
      contactUserId,
      status: 'PENDING',
    });

    const populatedContact: any = await Contact.findById(newContact._id)
      .populate({
        path: 'contactUserId',
        select: '_id name email avatarUrl bio status lastSeenAt',
      })
      .lean();

    const contactUser = populatedContact.contactUserId;

    return {
      id: populatedContact._id,
      userId: populatedContact.userId,
      contactUserId: populatedContact.contactUserId?._id || populatedContact.contactUserId,
      status: populatedContact.status,
      createdAt: populatedContact.createdAt,
      updatedAt: populatedContact.updatedAt,
      contactUser: typeof contactUser === 'object' && contactUser !== null
        ? {
            id: contactUser._id,
            name: contactUser.name,
            email: contactUser.email,
            avatarUrl: contactUser.avatarUrl,
            bio: contactUser.bio,
            status: contactUser.status,
            lastSeenAt: contactUser.lastSeenAt,
          }
        : null,
    };
  }

  static async acceptRequest(userId: string, id: string) {
    let contactDoc = await Contact.findById(id);

    if (!contactDoc) {
      contactDoc = await Contact.findOne({
        userId: id,
        contactUserId: userId,
        status: 'PENDING',
      });
    }

    if (!contactDoc) {
      throw new NotFoundError('Contact request not found');
    }

    if (contactDoc.contactUserId !== userId) {
      throw new ForbiddenError('You can only accept contact requests sent to you');
    }

    if (contactDoc.status !== 'ACCEPTED') {
      contactDoc.status = 'ACCEPTED';
      await contactDoc.save();
    }

    const updatedContact: any = await Contact.findById(contactDoc._id)
      .populate({
        path: 'userId',
        select: '_id name email avatarUrl bio status lastSeenAt',
      })
      .populate({
        path: 'contactUserId',
        select: '_id name email avatarUrl bio status lastSeenAt',
      })
      .lean();

    return {
      id: updatedContact._id,
      status: updatedContact.status,
      createdAt: updatedContact.createdAt,
      updatedAt: updatedContact.updatedAt,
      user: updatedContact.userId
        ? {
            id: updatedContact.userId._id,
            name: updatedContact.userId.name,
            email: updatedContact.userId.email,
            avatarUrl: updatedContact.userId.avatarUrl,
            bio: updatedContact.userId.bio,
            status: updatedContact.userId.status,
            lastSeenAt: updatedContact.userId.lastSeenAt,
          }
        : null,
      contactUser: updatedContact.contactUserId
        ? {
            id: updatedContact.contactUserId._id,
            name: updatedContact.contactUserId.name,
            email: updatedContact.contactUserId.email,
            avatarUrl: updatedContact.contactUserId.avatarUrl,
            bio: updatedContact.contactUserId.bio,
            status: updatedContact.contactUserId.status,
            lastSeenAt: updatedContact.contactUserId.lastSeenAt,
          }
        : null,
    };
  }
}
