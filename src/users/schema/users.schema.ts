import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, HydratedDocument } from "mongoose";


export type UserDocument = HydratedDocument<User>;

@Schema()
export class User  extends Document{
    @Prop({ required:true, index:true   })
    first_name: string;
    @Prop({ required:true   })
    last_name: string;
    @Prop({ required:true   })
    birthDate: Date;
    @Prop({ required:true, index:true, unique:true  })
    email: string;
    @Prop({ required:true   })
    password: string;
    @Prop()
    phone: string;
    @Prop()
    avatar: string;
    @Prop()
    resetPasswordToken: string;
    @Prop()
    resetPasswordExpires: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);