import { ChatsController } from '../chats/chats.controller';

export class MessagesController {
  static getMessages = ChatsController.getMessages;
  static sendMessage = ChatsController.sendMessage;
}
