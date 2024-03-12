import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Document } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';



export type ProductDocument = HydratedDocument<Product>

@Schema()
export class Product extends Document{
    @Prop({ required: true, index: true })
    name: string;

    @Prop()
    description: string;

    @Prop({ required: true })
    price: number;

    @Prop({ required: true, unique: true, index: true })
    code: string;

    @Prop({ required: true })
    stock: number;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Category', index: true, required:true })
    category: string;

    @Prop({ type: [String] })
    thumbnails: string[];

    @Prop({ required: true, default: true })
    status: boolean;

    @Prop({ required: true, default: true })
    isVisible: boolean;

    @Prop({ type: [String] })
    tags: string[];

    @Prop({ required: true, default: 'admin' })
    owner: string;

    @Prop({ default: Date.now })
    createdAt: Date;

    @Prop({ default: Date.now })
    updatedAt: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product).plugin(mongoosePaginate);