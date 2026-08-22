import { Router } from 'express';
import { ContactsController } from './contacts.controller';
import { authGuard } from '../../middlewares/authGuard';

const router = Router();

router.use(authGuard);
router.get('/', ContactsController.getContacts);
router.post('/request', ContactsController.sendRequest);
router.post('/:id/accept', ContactsController.acceptRequest);

export default router;
