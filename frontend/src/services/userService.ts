import { apiFetch } from './api';
import { User } from '../types';

export const userService = {
  getMe: () => apiFetch<User>('/users/me'),
};
