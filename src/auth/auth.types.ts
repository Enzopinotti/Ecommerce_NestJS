export interface AuthUserView {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface AuthSession {
  token: string;
  user: AuthUserView;
}
