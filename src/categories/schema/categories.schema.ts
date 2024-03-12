import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import  { HydratedDocument, Document } from "mongoose";



export type CategoryDocument = HydratedDocument<Category>

@Schema()
export class Category extends Document {
    @Prop({ required: true, index: true })
    nameCategory: string;
    @Prop({ required: true, default: true })
    isVisible: boolean;
    @Prop({ required: true, default: new Date() })
    createdAt: Date;
    @Prop({ required: true })
    description: string;
}

export const CategorySchema = SchemaFactory.createForClass(Category);