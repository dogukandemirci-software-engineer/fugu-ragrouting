import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateDto } from '../middlewares/validate-dto.middleware';
import { SignUpDto } from '../dto/auth/sign-up.dto';
import { LogInDto } from '../dto/auth/log-in.dto';
import { ForgotPasswordDto, ResetPasswordDto } from '../dto/auth/reset-password.dto';

const router = Router();

router.post('/sign-up', validateDto(SignUpDto), AuthController.signUp);
router.post('/google', AuthController.googleAuth);
router.post('/log-in', validateDto(LogInDto), AuthController.logIn);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);
router.get('/verify-email', AuthController.verifyEmail);
router.post('/forgot-password', validateDto(ForgotPasswordDto), AuthController.forgotPassword);
router.post('/reset-password', validateDto(ResetPasswordDto), AuthController.resetPassword);

export default router;
