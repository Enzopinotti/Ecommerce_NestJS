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

  findByToken(token: string) {
    return this.userModel.findOne({ resetPasswordToken: token });
  }

  update(id: string, updateUserDto: UpdateUserDto) {
    return this.userModel.updateOne({ _id: id }, updateUserDto);
  }

  remove(id: string) {
    return this.userModel.deleteOne({ _id: id });
  }
}
