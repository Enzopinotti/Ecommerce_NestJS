import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { hashPassword } from '../utils/encryption.util';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument } from './schema/users.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const { email, password, ...rest } = createUserDto;
    const hashedPassword = await hashPassword(String(password));
    return this.userModel.create({
      email: String(email),
      password: hashedPassword,
      ...rest,
    });
  }

  findAll(_limit?: unknown) {
    return this.userModel.find();
  }

  findOne(id: string) {
    return this.userModel.findById(id);
  }

  findByEmail(email: string) {
    return this.userModel.findOne({ email });
  }

  findAuthIdentityById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    return this.userModel
      .findById(id)
      .select('_id email first_name last_name')
      .exec();
  }

  async setPasswordResetDigest(
    id: string,
    tokenDigest: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.userModel
      .updateOne(
        { _id: id },
        {
          $set: {
            resetPasswordTokenDigest: tokenDigest,
            resetPasswordExpires: expiresAt,
          },
        },
      )
      .exec();
  }

  findPasswordResetCandidate(tokenDigest: string) {
    return this.userModel
      .findOne({ resetPasswordTokenDigest: tokenDigest })
      .select('password +resetPasswordExpires')
      .exec();
  }

  async clearPasswordResetDigest(
    id: string,
    tokenDigest: string,
  ): Promise<void> {
    await this.userModel
      .updateOne(
        { _id: id, resetPasswordTokenDigest: tokenDigest },
        {
          $unset: {
            resetPasswordTokenDigest: 1,
            resetPasswordExpires: 1,
          },
        },
      )
      .exec();
  }

  async consumePasswordReset(
    id: string,
    tokenDigest: string,
    passwordHash: string,
  ): Promise<boolean> {
    const result = await this.userModel
      .updateOne(
        {
          _id: id,
          resetPasswordTokenDigest: tokenDigest,
          resetPasswordExpires: { $gt: new Date() },
        },
        {
          $set: { password: passwordHash },
          $unset: {
            resetPasswordTokenDigest: 1,
            resetPasswordExpires: 1,
          },
        },
      )
      .exec();

    return result.modifiedCount === 1;
  }

  update(id: string, updateUserDto: UpdateUserDto) {
    return this.userModel.updateOne({ _id: id }, updateUserDto);
  }

  remove(id: string) {
    return this.userModel.deleteOne({ _id: id });
  }
}
