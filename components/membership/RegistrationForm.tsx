'use client';

/**
 * Unified Multi-Step Registration Form Component
 * 
 * A comprehensive registration form with FOUR steps:
 * 1. Account Creation - Create Supabase Auth account (email + password)
 * 2. Personal Information - Collect athlete's personal details
 * 3. Document Upload - Upload required documents (ID card, house registration, birth certificate)
 * 4. Sport Selection - Choose which sport/club to join
 * 
 * Features:
 * - Progress indicator showing current step (1/4, 2/4, 3/4, 4/4)
 * - Navigation buttons (Next, Back, Submit)
 * - Form state management with useState
 * - Step validation before allowing progression
 * - Creates account in Step 1, then submits application in Step 4
 * - Loading states during submission
 * - Error handling with user-friendly messages
 * 
 * Validates: Requirements US-1, US-2, NFR-1
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AccountCreationForm from './AccountCreationForm';
import PersonalInfoForm from './PersonalInfoForm';
import DocumentUpload from './DocumentUpload';
import { SportSelection } from './SportSelection';
import { signUp } from '@/lib/auth/actions';
import { submitApplication } from '@/lib/membership/actions';
import { validateEmail, validatePassword } from '@/lib/auth/validation';
import { personalInfoSchema, type PersonalInfoInput } from '@/lib/membership/validation';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface RegistrationFormProps {
  onSuccess?: () => void;
}

type Step = 1 | 2 | 3 | 4;

interface DocumentInfo {
  url: string;
  file_name: string;
  file_size: number;
}

interface FormState {
  account: {
    email: string;
    password: string;
    confirmPassword: string;
  };
  personalInfo: PersonalInfoInput;
  documents: {
    id_card: DocumentInfo | null;
    house_registration: DocumentInfo | null;
    birth_certificate: DocumentInfo | null;
    parent_id_card: DocumentInfo | null;
    parent_house_registration: DocumentInfo | null;
  };
  clubId: string;
}

export default function RegistrationForm({ onSuccess }: RegistrationFormProps) {
  // Form state
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormState>({
    account: {
      email: '',
      password: '',
      confirmPassword: '',
    },
    personalInfo: {
      full_name: '',
      nickname: '',
      gender: '' as any,
      date_of_birth: '',
      phone_number: '',
      address: '',
      emergency_contact: '',
      blood_type: '',
      medical_conditions: '',
    },
    documents: {
      id_card: null,
      house_registration: null,
      birth_certificate: null,
      parent_id_card: null,
      parent_house_registration: null,
    },
    clubId: '',
  });

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});



  // Validate Step 1: Account Creation
  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {};

    const emailValidation = validateEmail(formData.account.email);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.errors[0];
    }

    const passwordValidation = validatePassword(formData.account.password);
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.errors[0];
    }

    if (formData.account.password !== formData.account.confirmPassword) {
      errors.confirmPassword = 'รหัสผ่านไม่ตรงกัน';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate Step 2: Personal Information
  const validateStep2 = (): boolean => {
    try {
      personalInfoSchema.parse(formData.personalInfo);
      setValidationErrors({});
      return true;
    } catch (error: any) {
      const errors: Record<string, string> = {};
      if (error.errors) {
        error.errors.forEach((err: any) => {
          const field = err.path[0];
          errors[field] = err.message;
        });
      }
      setValidationErrors(errors);
      return false;
    }
  };

  // Validate Step 3: Documents
  const validateStep3 = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.documents.id_card || !formData.documents.id_card.url) {
      errors.id_card = 'กรุณาอัปโหลดรูปบัตรประชาชนนักกีฬา';
    }
    if (!formData.documents.house_registration || !formData.documents.house_registration.url) {
      errors.house_registration = 'กรุณาอัปโหลดรูปทะเบียนบ้านนักกีฬา';
    }
    if (!formData.documents.birth_certificate || !formData.documents.birth_certificate.url) {
      errors.birth_certificate = 'กรุณาอัปโหลดรูปสูติบัตร';
    }
    if (!formData.documents.parent_id_card || !formData.documents.parent_id_card.url) {
      errors.parent_id_card = 'กรุณาอัปโหลดรูปบัตรประชาชนผู้ปกครอง';
    }
    if (!formData.documents.parent_house_registration || !formData.documents.parent_house_registration.url) {
      errors.parent_house_registration = 'กรุณาอัปโหลดรูปทะเบียนบ้านผู้ปกครอง';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate Step 4: Sport Selection
  const validateStep4 = (): boolean => {
    if (!formData.clubId) {
      setSubmitError('กรุณาเลือกกีฬาที่ต้องการสมัคร');
      return false;
    }
    setSubmitError(null);
    return true;
  };

  // Handle Next button
  const handleNext = async () => {
    let isValid = false;

    if (currentStep === 1) {
      // Step 1: Create account
      isValid = validateStep1();
      if (isValid) {
        setIsSubmitting(true);
        setSubmitError(null);

        try {
          const result = await signUp(formData.account.email, formData.account.password);

          if (!result.success) {
            setSubmitError(result.error || 'การสร้างบัญชีล้มเหลว');
            setIsSubmitting(false);
            return;
          }

          // Save user ID for later use
          if (result.userId) {
            setUserId(result.userId);
          }

          setIsSubmitting(false);
          setCurrentStep(2);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
          setSubmitError('เกิดข้อผิดพลาดที่ไม่คาดคิด');
          setIsSubmitting(false);
        }
      }
    } else if (currentStep === 2) {
      isValid = validateStep2();
      if (isValid && currentStep < 4) {
        setCurrentStep((prev) => (prev + 1) as Step);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else if (currentStep === 3) {
      isValid = validateStep3();
      if (isValid && currentStep < 4) {
        setCurrentStep((prev) => (prev + 1) as Step);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  // Handle Back button
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
      setValidationErrors({});
      setSubmitError(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Final validation
    if (!validateStep4()) {
      return;
    }

    if (!userId) {
      setSubmitError('ไม่พบข้อมูลผู้ใช้ กรุณาลองใหม่อีกครั้ง');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Prepare documents array for submission
      const documentsArray = [
        {
          type: 'id_card' as const,
          url: formData.documents.id_card!.url,
          uploaded_at: new Date().toISOString(),
          file_name: formData.documents.id_card!.file_name,
          file_size: formData.documents.id_card!.file_size,
        },
        {
          type: 'house_registration' as const,
          url: formData.documents.house_registration!.url,
          uploaded_at: new Date().toISOString(),
          file_name: formData.documents.house_registration!.file_name,
          file_size: formData.documents.house_registration!.file_size,
        },
        {
          type: 'birth_certificate' as const,
          url: formData.documents.birth_certificate!.url,
          uploaded_at: new Date().toISOString(),
          file_name: formData.documents.birth_certificate!.file_name,
          file_size: formData.documents.birth_certificate!.file_size,
        },
      ];

      // Submit application
      const result = await submitApplication({
        club_id: formData.clubId,
        personal_info: formData.personalInfo,
        documents: documentsArray,
      });

      if (result.success) {
        // Success! Call onSuccess callback
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setSubmitError(result.error || 'ไม่สามารถส่งใบสมัครได้');
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      setSubmitError('เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update account info
  const handleAccountChange = (value: {
    email: string;
    password: string;
    confirmPassword: string;
  }) => {
    setFormData((prev) => ({
      ...prev,
      account: value,
    }));
  };

  // Update personal info
  const handlePersonalInfoChange = (value: PersonalInfoInput) => {
    setFormData((prev) => ({
      ...prev,
      personalInfo: value,
    }));
  };

  // Update document
  const handleDocumentChange = (
    documentType: 'id_card' | 'house_registration' | 'birth_certificate' | 'parent_id_card' | 'parent_house_registration',
    documentInfo: DocumentInfo | null
  ) => {
    setFormData((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [documentType]: documentInfo,
      },
    }));
  };

  // Update club selection
  const handleClubSelect = (clubId: string) => {
    setFormData((prev) => ({
      ...prev,
      clubId,
    }));
    setSubmitError(null);
  };

  // Progress indicator
  const progressPercentage = (currentStep / 4) * 100;

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">สมัครสมาชิกสโมสรกีฬา</CardTitle>
          <CardDescription>
            กรอกข้อมูลให้ครบถ้วนเพื่อสมัครเข้าร่วมกีฬา
          </CardDescription>

          {/* Progress Indicator */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                ขั้นตอนที่ {currentStep} จาก 4
              </span>
              <span className="text-sm text-gray-500">
                {currentStep === 1 && 'สร้างบัญชี'}
                {currentStep === 2 && 'ข้อมูลส่วนตัว'}
                {currentStep === 3 && 'อัปโหลดเอกสาร'}
                {currentStep === 4 && 'เลือกกีฬา'}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Step Indicators */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center space-x-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= 1
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {currentStep > 1 ? <CheckCircle2 className="w-5 h-5" /> : '1'}
              </div>
              <span className="text-sm font-medium text-gray-700 hidden sm:inline">บัญชี</span>
            </div>

            <div className="flex-1 h-0.5 bg-gray-200 mx-2" />

            <div className="flex items-center space-x-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= 2
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {currentStep > 2 ? <CheckCircle2 className="w-5 h-5" /> : '2'}
              </div>
              <span className="text-sm font-medium text-gray-700 hidden sm:inline">ข้อมูล</span>
            </div>

            <div className="flex-1 h-0.5 bg-gray-200 mx-2" />

            <div className="flex items-center space-x-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= 3
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {currentStep > 3 ? <CheckCircle2 className="w-5 h-5" /> : '3'}
              </div>
              <span className="text-sm font-medium text-gray-700 hidden sm:inline">เอกสาร</span>
            </div>

            <div className="flex-1 h-0.5 bg-gray-200 mx-2" />

            <div className="flex items-center space-x-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= 4
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                4
              </div>
              <span className="text-sm font-medium text-gray-700 hidden sm:inline">กีฬา</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Step 1: Account Creation */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <AccountCreationForm
                value={formData.account}
                onChange={handleAccountChange}
                errors={validationErrors}
              />
              {submitError && (
                <>
                  {submitError.includes('ลองสมัครบ่อยเกินไป') || submitError.includes('rate') || submitError.includes('too many') ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3 mb-3">
                        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-yellow-800 font-medium mb-1">
                            ⏰ ระบบตรวจพบการสมัครบ่อยเกินไป
                          </p>
                          <p className="text-xs text-yellow-700 mb-2">
                            เพื่อความปลอดภัย ระบบจำกัดจำนวนการสมัครต่อชั่วโมง (3-5 ครั้งต่อ IP address)
                          </p>
                          <p className="text-xs text-yellow-700 font-medium">
                            ⚠️ Rate limit อาจใช้เวลา 2-24 ชั่วโมงในการรีเซ็ต
                          </p>
                        </div>
                      </div>
                      <div className="bg-yellow-100 rounded p-3 text-xs text-yellow-800 space-y-3">
                        <div>
                          <p className="font-medium mb-2">💡 วิธีแก้ไขทันที (แนะนำ):</p>
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            <li><strong>เปลี่ยน IP address:</strong> ใช้ mobile hotspot หรือ mobile data แทน WiFi</li>
                            <li><strong>ใช้ VPN:</strong> เปลี่ยน location แล้วลองใหม่</li>
                            <li><strong>ใช้เครือข่ายอื่น:</strong> ลองจากสถานที่อื่น (บ้าน/ออฟฟิศ/ร้านกาแฟ)</li>
                          </ul>
                        </div>
                        <div className="border-t border-yellow-200 pt-2">
                          <p className="font-medium mb-2">⏰ หรือรอให้ Rate Limit หมดอายุ:</p>
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>รอ 2-24 ชั่วโมง แล้วลองใหม่อีกครั้ง</li>
                            <li>ติดต่อเจ้าหน้าที่เพื่อขอความช่วยเหลือ</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-800">{submitError}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 2: Personal Information */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <PersonalInfoForm
                value={formData.personalInfo}
                onChange={handlePersonalInfoChange}
                errors={validationErrors}
              />
            </div>
          )}

          {/* Step 3: Document Upload */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  📸 กรุณาอัปโหลดเอกสารทั้ง 3 ประเภท: บัตรประชาชน, ทะเบียนบ้าน, และสูติบัตร
                </p>
              </div>

              <DocumentUpload
                documentType="id_card"
                value={formData.documents.id_card?.url}
                onChange={(url, fileName, fileSize) => 
                  handleDocumentChange('id_card', url ? { url, file_name: fileName || '', file_size: fileSize || 0 } : null)
                }
                error={validationErrors.id_card}
                userId={userId}
              />

              <DocumentUpload
                documentType="house_registration"
                value={formData.documents.house_registration?.url}
                onChange={(url, fileName, fileSize) => 
                  handleDocumentChange('house_registration', url ? { url, file_name: fileName || '', file_size: fileSize || 0 } : null)
                }
                error={validationErrors.house_registration}
                userId={userId}
              />

              <DocumentUpload
                documentType="birth_certificate"
                value={formData.documents.birth_certificate?.url}
                onChange={(url, fileName, fileSize) => 
                  handleDocumentChange('birth_certificate', url ? { url, file_name: fileName || '', file_size: fileSize || 0 } : null)
                }
                error={validationErrors.birth_certificate}
                userId={userId}
              />

              <div className="pt-4 border-t">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">เอกสารผู้ปกครอง</h3>
                
                <DocumentUpload
                  documentType="parent_id_card"
                  value={formData.documents.parent_id_card?.url}
                  onChange={(url, fileName, fileSize) => 
                    handleDocumentChange('parent_id_card', url ? { url, file_name: fileName || '', file_size: fileSize || 0 } : null)
                  }
                  error={validationErrors.parent_id_card}
                  userId={userId}
                />

                <DocumentUpload
                  documentType="parent_house_registration"
                  value={formData.documents.parent_house_registration?.url}
                  onChange={(url, fileName, fileSize) => 
                    handleDocumentChange('parent_house_registration', url ? { url, file_name: fileName || '', file_size: fileSize || 0 } : null)
                  }
                  error={validationErrors.parent_house_registration}
                  userId={userId}
                />
              </div>
            </div>
          )}

          {/* Step 4: Sport Selection */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  🏆 เลือกกีฬาที่คุณต้องการสมัคร (เลือกได้ 1 กีฬา)
                </p>
                <p className="text-xs text-blue-700 mt-2">
                  โค้ชจะได้รับมอบหมายให้คุณหลังจากการอนุมัติใบสมัคร
                </p>
              </div>

              <SportSelection
                onSelect={handleClubSelect}
                selectedClubId={formData.clubId}
              />

              {/* Selection Confirmation */}
              {formData.clubId && !submitError && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-800">
                    คุณได้เลือกกีฬาแล้ว กดปุ่ม "ส่งใบสมัคร" เพื่อดำเนินการต่อ
                  </p>
                </div>
              )}

              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{submitError}</p>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1 || isSubmitting}
            >
              ย้อนกลับ
            </Button>

            <div className="flex items-center space-x-3">
              {currentStep < 4 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={isSubmitting}
                  className="min-w-[120px]"
                >
                  {isSubmitting && currentStep === 1 ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      กำลังสร้างบัญชี...
                    </>
                  ) : (
                    'ถัดไป'
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !formData.clubId}
                  className="min-w-[120px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      กำลังส่ง...
                    </>
                  ) : (
                    'ส่งใบสมัคร'
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
