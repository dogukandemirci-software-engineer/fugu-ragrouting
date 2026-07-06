import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateDto } from '../middlewares/validate-dto.middleware';
import { authRateLimitMiddleware } from '../middlewares/rate-limit.middleware';
import { requireAuth } from '../middlewares/auth.middleware';
import { SignUpDto } from '../dto/auth/sign-up.dto';
import { LogInDto } from '../dto/auth/log-in.dto';
import { ForgotPasswordDto, ResetPasswordDto } from '../dto/auth/reset-password.dto';
import { RefreshTokenDto } from '../dto/auth/refresh-token.dto';

const router = Router();

router.post('/sign-up', authRateLimitMiddleware, validateDto(SignUpDto), AuthController.signUp);
router.post('/google', authRateLimitMiddleware, AuthController.googleAuth);
router.post('/log-in', authRateLimitMiddleware, validateDto(LogInDto), AuthController.logIn);
router.post('/refresh', validateDto(RefreshTokenDto), AuthController.refresh);
router.post('/logout', validateDto(RefreshTokenDto), AuthController.logout);
router.get('/my-organizations', requireAuth, AuthController.listMyOrganizations);
router.post('/switch-org/:orgId', requireAuth, AuthController.switchOrg);
router.get('/verify-email', authRateLimitMiddleware, AuthController.verifyEmail);
router.post('/forgot-password', authRateLimitMiddleware, validateDto(ForgotPasswordDto), AuthController.forgotPassword);
router.post('/reset-password', authRateLimitMiddleware, validateDto(ResetPasswordDto), AuthController.resetPassword);

export default router;
