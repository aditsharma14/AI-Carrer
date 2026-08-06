import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { profileApi } from './api';

export function useUpdateProfile() {
  return useMutation({
    mutationFn: profileApi.updateProfile,
    onSuccess: () => toast.success('Profile updated'),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: profileApi.changePassword,
    onSuccess: () => toast.success('Password changed'),
  });
}
