import { Router } from 'express';
import { TeamController } from '../controllers/team.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { validateDto } from '../middlewares/validate-dto.middleware';
import { InviteTeamMemberDto, UpdateTeamMemberRoleDto } from '../dto/team/team.dto';
import { rateLimitMiddleware } from '../middlewares/rate-limit.middleware';

const router = Router();
router.use(requireAuth);
router.use(rateLimitMiddleware);

router.get('/', TeamController.list);
router.post('/invite', requireRole('owner', 'admin'), validateDto(InviteTeamMemberDto), TeamController.invite);
router.patch('/:memberId/role', requireRole('owner', 'admin'), TeamController.updateRole);
router.delete('/:memberId', requireRole('owner', 'admin'), TeamController.remove);

export default router;
