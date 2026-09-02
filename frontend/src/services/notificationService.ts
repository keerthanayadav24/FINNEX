import { apiFetch } from './api';
import { Notification } from '../types';

export const notificationService = {
  getNotifications: () => apiFetch<Notification[]>('/notifications'),
};
