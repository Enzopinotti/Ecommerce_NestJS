import { PasswordRecoveryService } from './password-recovery.service';
import { UsersController } from './users.controller';

describe('UsersController recovery boundary', () => {
  let controller: UsersController;
  let passwordRecoveryService: {
    requestReset: jest.Mock;
    resetPassword: jest.Mock;
  };

  beforeEach(() => {
    passwordRecoveryService = {
      requestReset: jest.fn(),
      resetPassword: jest.fn(),
    };
    controller = new UsersController(
      passwordRecoveryService as unknown as PasswordRecoveryService,
    );
  });

  it('returns the same generic recovery response after delegating the email', async () => {
    passwordRecoveryService.requestReset.mockResolvedValue(undefined);

    await expect(
      controller.recoveryPassword({ email: 'person@example.test' }),
    ).resolves.toEqual({
      status: 'accepted',
      message:
        'If the account exists, password recovery instructions will be sent.',
    });
  });

  it('delegates reset without exposing credential state', async () => {
    passwordRecoveryService.resetPassword.mockResolvedValue(undefined);

    await expect(
      controller.resetPassword({
        token: 'x'.repeat(43),
        password: 'NewPassword2',
      }),
    ).resolves.toEqual({
      message: 'Password updated successfully',
      status: 'success',
    });
  });
});
