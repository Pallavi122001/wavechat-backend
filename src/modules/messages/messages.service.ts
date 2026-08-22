import { ChatsService } from '../chats/chats.service';

export class MessagesService {
  static getThreadMessages = ChatsService.getThreadMessages;
  static sendMessage = ChatsService.sendMessage;
}
