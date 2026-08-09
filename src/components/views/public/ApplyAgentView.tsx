import React, { useState, useEffect } from 'react';
import { StorageRepo } from '../../../lib/storage';
import { Bike, ShieldCheck, CheckCircle2, Sparkles, User, FileText, Phone, AlertCircle, Loader2 } from 'lucide-react';
import { DeliveryAgent } from '../../../types/domain';

interface ApplyAgentViewProps {
  onNavigate: (tab: string, param?: string) => void;
}

export const ApplyAgentView: React.FC<ApplyAgentViewProps> = ({ onNavigate }) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleType, setVehicleType] = useState<'motorcycle' | 'bicycle' | 'car' | 'walking'>('motorcycle');
  const [nationalId, setNationalId] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [city, setCity] = useState('القاهرة');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [applicationId, setApplicationId] = useState('');

  const currentUser = StorageRepo.getCurrentUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!currentUser) {
      sessionStorage.setItem('applyAgentReturn', 'true');
      onNavigate('auth');
      return;
    }

    if (!fullName.trim() || !phone.trim() || !nationalId.trim()) {
      setSubmitError('جميع الحقول المطلوبة يجب أن تُملأ (الاسم، الهاتف، الرقم القومي)');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 11) {
      setSubmitError('رقم الهاتف يجب أن يتكون من 11 رقماً');
      return;
    }
    if (nationalId.replace(/\D/g, '').length !== 14) {
      setSubmitError('الرقم القومي يجب أن يتكون من 14 رقماً');
      return;
    }

    const newAgent: Partial<DeliveryAgent> = {
      user_id: currentUser.id,
      name: fullName.trim(),
      phone: cleanPhone,
      vehicle_type: vehicleType,
      national_id: nationalId.trim(),
      license_plate: licenseNumber.trim() || undefined,
      active_zone: city.trim(),
      is_approved: false,
      is_active: false,
      is_online: false,
    };

    setIsSubmitting(true);
    try {
      const saved = await StorageRepo.saveAgent(newAgent, { isSelf: true });
      setApplicationId(saved.id.slice(0, 8).toUpperCase());
      setIsSubmitted(true);
    } catch (err: any) {
      setSubmitError(err.message || 'فشل تقديم الطلب، يرجى المحاولة لاحقاً');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (currentUser && sessionStorage.getItem('applyAgentReturn')) {
      sessionStorage.removeItem('applyAgentReturn');
    }
  }, [currentUser]);

  if (isSubmitted) { /* نفس المحتوى السابق */ }
  // باقي الكود كما هو مع استخدام StorageRepo.saveAgent
};