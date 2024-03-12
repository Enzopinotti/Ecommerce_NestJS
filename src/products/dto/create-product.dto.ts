export class CreateProductDto {
    name: String;
    description: String;
    price: Number;
    code: String;
    stock: Number;
    category: String;
    thumbnails: Array<String>;
    status: Boolean;
    isVisible: Boolean;
    tags: Array<String>;
    createdAt: Date;
    updatedAt: Date;
}
