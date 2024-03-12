import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schema/users.schema';
import { Model } from 'mongoose';
import { hashPassword } from 'src/utils/encryption.util';

@Injectable()
export class  UsersService {

  constructor(@InjectModel(User.name) private userModel: Model <UserDocument> ) {}

  async create(createUserDto: CreateUserDto) {
    const { email, password, ...rest } = createUserDto; // Extrae la contraseña del DTO
    const hashedPassword = await hashPassword(password);
    const newUser = new this.userModel({ email, password: hashedPassword, ...rest }); // Cifra la contraseña
    return this.userModel.create(newUser);;
  }

  findAll(limit) {
    return this.userModel.find();
  }

  findOne(id: string) {
    return this.userModel.findById(id);
  }

  findByEmail(email: String) {
    return this.userModel.findOne({ email });
  }

  findByToken (token: string) {
    console.log(token)
    return this.userModel.findOne({ resetPasswordToken: token });
  }

  update(id: string, updateUserDto: UpdateUserDto) {
    return this.userModel.updateOne( { '_id':id }, updateUserDto );
  }

  remove(id: string) {
    return this.userModel.deleteOne( { '_id':id } );
  }
}
