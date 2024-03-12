import { Controller, Get, HttpException, HttpStatus, Logger, Param, Query, Redirect, Render, Req, Res, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users/users.service';
import { ProductsService } from './products/products.service';
import { Product } from './products/schema/products.schema';
import { CategoriesService } from './categories/categories.service';
import { Request } from 'express';
import { JwtAuthGuard } from './users/auth/jwt-auth.guard';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    private readonly userService: UsersService,
    private readonly productService: ProductsService,
    private readonly categoryService: CategoriesService, 
    private config: ConfigService, 
    
  ) {}
  
  @Get()
  @Redirect('/login') // Redirecciona "/" a "/login"
  redirectToLogin() {
    return {};
  }
  
  @Get('login')
  @Render('login')
  getLoginView() {
    const title = 'Login'; 
    const style = 'login.css'; 
    return { title, style }; 
  }

  @Get('register')
  @Render('register') // Renderiza la vista register.handlebars en views/
  getRegisterView() {
    const title = 'Register'; 
    const style = 'register.css'; 
    return { title, style }; 
  }

  @Get('logout')
  logoutUser(@Res() res: any) {
    try {
      // Limpiar la cookie de token de acceso
      res.clearCookie('access_token');
      // Redirigir al usuario a la página de inicio de sesión
      res.redirect('/login');
    } catch (error) {
      // Manejar errores en caso de que ocurran al limpiar la cookie o redirigir
      console.error('Error al cerrar sesión:', error);
      // Enviar una respuesta de error al cliente
      res.status(500).send('Error al cerrar sesión');
    }
  }

  @Get('profile')
  @Render('profile')
  getProfileView(@Req() req: any) {
    const user = req.user;
    console.log('user en controller: ', user)
    const title = 'Profile';
    const style = 'profile.css';
    return { title, style };
  }
  
  @Get('recoveryPass')
  @Render('recoveryPass')
  getRecoveryPassView() {
    const title = 'Recovery Password';
    const style = 'recoveryPass.css';
    return { title, style };
  }

  @Get('resetPassword/:tokenId')
  @Render('resetPass')
  async getResetPassView(@Param('tokenId') id: string, @Res() res: Response) {
    const user = await this.userService.findByToken(id);
    if (!user) {
      // Si no se encuentra ningún usuario con el token, redirigir al login
      this.logger.debug('No se encontró ningún usuario con el token proporcionado.');
    }
    const title = 'Reset Password';
    const style = 'resetPass.css';
    return { title, style, tokenId: id };
  }

  @Get('products')
  @Render('products')
  async getProductsView(@Query() options: { page: number; limit: number; sort: string; query: string }): Promise<any> {
    try {
      options.page = options.page || 1;
      options.limit = options.limit || 10;
      options.sort = options.sort || 'name';
      options.query = options.query || '';
      const categories = await this.categoryService.findAll();
      const categoryMap = {};
      categories.forEach(category => {
        categoryMap[category._id.toString()] = category.nameCategory; // Mapea el ID de la categoría al nombre
      });

      const { products, totalPages, hasNextPage, hasPrevPage, totalDocs} = await this.productService.findAllView(options);
      return {
        products,
        totalPages,
        currentPage: options.page,
        hasNextPage,
        hasPrevPage,
        prevLink: hasPrevPage ? `/products?page=${options.page - 1}&limit=${options.limit}` : null,
        nextLink: hasNextPage ? `/products?page=${options.page + 1}&limit=${options.limit}` : null,
        totalDocs,
        categoryMap,
        style: 'products.css',
        title: 'Productos',
        user: null 
      };
    } catch (error) {
      console.error("Error al obtener la vista de productos:", error);
      throw error; // Puedes manejar el error de otra manera si lo deseas
    }
  }
}


//Bueno ahora necesito que me ayudes a modificar mi handlebars 'products' para poder enviar desde el front (o no) estos querys que configuramos 


