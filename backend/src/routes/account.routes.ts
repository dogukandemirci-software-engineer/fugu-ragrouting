import { Router } from 'express';
import { AccountController } from '../controllers/account.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { validateDto } from '../middlewares/validate-dto.middleware';
import { UpdateProfileDto } from '../dto/account/update-profile.dto';
import { rateLimitMiddleware } from '../middlewares/rate-limit.middleware';

const router = Router();
router.use(requireAuth);
router.use(rateLimitMiddleware);

router.patch('/profile', validateDto(UpdateProfileDto), AccountController.updateProfile);
router.get('/export', AccountController.exportData);
router.delete('/organization', requireRole('owner'), AccountController.deleteOrganization);

// Pending team invitations for the logged-in user — not org-scoped, since a
// pending invite grants no org membership yet (see organization.repository.ts).
router.get('/invitations', AccountController.listInvitations);
router.post('/invitations/:orgId/accept', AccountController.acceptInvitation);
router.post('/invitations/:orgId/decline', AccountController.declineInvitation);

export default router;
