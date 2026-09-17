import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { User } from './schema/users.schema';
import { UsersService } from './users.service';

describe('UsersService recovery persistence', () => {
  let service: UsersService;
  let userModel: {
    updateOne: jest.Mock;
    findOne: jest.Mock;
  };

  beforeEach(async () => {
    userModel = {
      updateOne: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: userModel,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('persists only the reset digest and expiry', async () => {
    const exec = jest.fn().mockResolvedValue({ modifiedCount: 1 });
    userModel.updateOne.mockReturnValue({ exec });
    const expiresAt = new Date(Date.now() + 60_000);

    await service.setPasswordResetDigest(
      '507f1f77bcf86cd799439011',
      'a'.repeat(64),
      expiresAt,
    );

    expect(userModel.updateOne).toHaveBeenCalledWith(
      { _id: '507f1f77bcf86cd799439011' },
      {
        $set: {
          resetPasswordTokenDigest: 'a'.repeat(64),
          resetPasswordExpires: expiresAt,
        },
      },
    );
  });

  it('consumes a digest atomically with its unexpired predicate', async () => {
    const exec = jest.fn().mockResolvedValue({ modifiedCount: 1 });
    userModel.updateOne.mockReturnValue({ exec });

    await expect(
      service.consumePasswordReset(
        '507f1f77bcf86cd799439011',
        'b'.repeat(64),
        'bcrypt-hash',
      ),
    ).resolves.toBe(true);

    const [filter, update] = userModel.updateOne.mock.calls[0];
    expect(filter).toEqual(
      expect.objectContaining({
        _id: '507f1f77bcf86cd799439011',
        resetPasswordTokenDigest: 'b'.repeat(64),
        resetPasswordExpires: expect.objectContaining({ $gt: expect.any(Date) }),
      }),
    );
    expect(update).toEqual({
      $set: { password: 'bcrypt-hash' },
      $unset: {
        resetPasswordTokenDigest: 1,
        resetPasswordExpires: 1,
      },
    });
  });
});
