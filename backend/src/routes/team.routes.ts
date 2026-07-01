import { Router } from 'express';
import { TeamController } from '../controllers/team.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validateDto } from '../middlewares/validate-dto.middleware';
import { InviteTeamMemberDto, UpdateTeamMemberRoleDto } from '../dto/team/team.dto';

const router = Router();
router.use(requireAuth);

router.get('/', TeamController.list);
router.post('/invite', validateDto(InviteTeamMemberDto), TeamController.invite);
router.patch('/:memberId/role', TeamController.updateRole);
router.delete('/:memberId', TeamController.remove);

export default router;
