import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { appClient } from '@/api/appClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
    Camera,
    Video,
    FileText,
    CheckCircle2,
    Upload,
    ArrowRight,
    ArrowLeft,
    Home,
    ChefHat,
    Bath,
    BedDouble,
    AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

const ROOMS = [
    { key: 'living_room', label: 'Living Room', icon: Home },
    { key: 'kitchen', label: 'Kitchen', icon: ChefHat },
    { key: 'bathroom', label: 'Bathroom', icon: Bath },
    { key: 'bedrooms', label: 'Bedrooms', icon: BedDouble },
];

const CONDITIONS = [
    { value: 'excellent', label: 'Excellent', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { value: 'good', label: 'Good', color: 'text-blue-600', bg: 'bg-blue-50' },
    { value: 'fair', label: 'Fair', color: 'text-amber-600', bg: 'bg-amber-50' },
    { value: 'poor', label: 'Poor', color: 'text-red-600', bg: 'bg-red-50' },
];

export default function Inspection() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [user, setUser] = useState(null);
    const [currentRoom, setCurrentRoom] = useState(0);
    const [uploading, setUploading] = useState(false);

    const [inspectionData, setInspectionData] = useState({
        property_id: '',
        property_title: '',
        lease_id: '',
        inspection_type: 'move_in',
        checklist: {
            living_room: { condition: '', photos: [], notes: '' },
            kitchen: { condition: '', photos: [], notes: '' },
            bathroom: { condition: '', photos: [], notes: '' },
            bedrooms: { condition: '', photos: [], notes: '' },
        },
        video_url: '',
        overall_notes: '',
    });

    useEffect(() => {
        appClient.auth.me().then(setUser).catch(() => { });
    }, []);

    const { data: leases } = useQuery({
        queryKey: ['my-leases'],
        queryFn: () => appClient.entities.Lease.filter({ tenant_id: user?.email }),
        enabled: !!user,
        initialData: [],
    });

    const createInspectionMutation = useMutation({
        mutationFn: (data) => appClient.entities.Inspection.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['inspections']);
            toast.success('Inspection submitted! Landlord will review shortly.');
            navigate(createPageUrl('Dashboard'));
        },
    });

    const handleUploadPhoto = async (roomKey) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.onchange = async (e) => {
            const files = Array.from(e.target.files);
            setUploading(true);

            try {
                const uploadedUrls = [];
                for (const file of files) {
                    const { file_url } = await appClient.integrations.Core.UploadFile({ file });
                    uploadedUrls.push(file_url);
                }

                setInspectionData(prev => ({
                    ...prev,
                    checklist: {
                        ...prev.checklist,
                        [roomKey]: {
                            ...prev.checklist[roomKey],
                            photos: [...prev.checklist[roomKey].photos, ...uploadedUrls]
                        }
                    }
                }));
                toast.success(`${files.length} photo(s) uploaded`);
            } catch (error) {
                toast.error('Failed to upload photos');
            } finally {
                setUploading(false);
            }
        };
        input.click();
    };

    const handleUploadVideo = async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            setUploading(true);
            try {
                const { file_url } = await appClient.integrations.Core.UploadFile({ file });
                setInspectionData(prev => ({ ...prev, video_url: file_url }));
                toast.success('Video uploaded successfully');
            } catch (error) {
                toast.error('Failed to upload video');
            } finally {
                setUploading(false);
            }
        };
        input.click();
    };

    const updateRoomData = (roomKey, field, value) => {
        setInspectionData(prev => ({
            ...prev,
            checklist: {
                ...prev.checklist,
                [roomKey]: {
                    ...prev.checklist[roomKey],
                    [field]: value
                }
            }
        }));
    };

    const handleNext = () => {
        if (currentRoom < ROOMS.length - 1) {
            setCurrentRoom(currentRoom + 1);
        }
    };

    const handleBack = () => {
        if (currentRoom > 0) {
            setCurrentRoom(currentRoom - 1);
        }
    };

    const handleSubmit = () => {
        if (!inspectionData.property_id) {
            toast.error('Please select a property');
            return;
        }

        const activeLease = leases.find(l => l.property_id === inspectionData.property_id);

        createInspectionMutation.mutate({
            ...inspectionData,
            tenant_id: user?.email,
            landlord_id: activeLease?.landlord_id,
            lease_id: activeLease?.id,
            inspection_date: new Date().toISOString(),
            status: 'tenant_completed',
        });
    };

    const progress = ((currentRoom + 1) / ROOMS.length) * 100;
    const currentRoomData = ROOMS[currentRoom];
    const roomData = inspectionData.checklist[currentRoomData.key];

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Move-In Inspection</h1>
                <p className="text-slate-600">Document the condition of your new home</p>
            </div>

            {/* Property Selection */}
            {!inspectionData.property_id && leases.length > 0 && (
                <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm mb-6">
                    <h3 className="font-semibold text-slate-900 mb-4">Select Property</h3>
                    <div className="space-y-3">
                        {leases.map(lease => (
                            <button
                                key={lease.id}
                                onClick={() => setInspectionData(prev => ({
                                    ...prev,
                                    property_id: lease.property_id,
                                    property_title: lease.property_title,
                                    lease_id: lease.id,
                                }))}
                                className="w-full text-left p-4 border border-zinc-200 hover:border-zinc-900 hover:bg-zinc-50 transition-colors"
                            >
                                <p className="font-semibold text-zinc-900 text-sm">{lease.property_title}</p>
                                <p className="text-xs text-zinc-500">{lease.property_address}</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {inspectionData.property_id && (
                <>
                    {/* Progress */}
                    <div className="mb-6">
                        <div className="flex justify-between text-xs text-zinc-600 mb-2">
                            <span>Room {currentRoom + 1} of {ROOMS.length}</span>
                            <span>{Math.round(progress)}% Complete</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                    </div>

                    {/* Current Room */}
                    <div
                        key={currentRoom}
                        className="sharp-card bg-white p-6 sm:p-8 border border-transparent hover:border-zinc-900 transition-all duration-200 mb-6"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-zinc-100 flex items-center justify-center">
                                <currentRoomData.icon className="w-6 h-6 text-zinc-900" />
                            </div>
                            <h2 className="text-xl font-bold text-zinc-900">{currentRoomData.label}</h2>
                        </div>

                        {/* Condition Rating */}
                        <div className="mb-6">
                            <Label className="mb-3 block text-xs font-semibold text-zinc-700">Overall Condition *</Label>
                            <RadioGroup
                                value={roomData.condition}
                                onValueChange={(v) => updateRoomData(currentRoomData.key, 'condition', v)}
                            >
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {CONDITIONS.map(cond => (
                                        <label
                                            key={cond.value}
                                            className={`flex items-center gap-2 p-3.5 border cursor-pointer transition-colors ${roomData.condition === cond.value
                                                    ? `border-zinc-900 font-bold bg-zinc-50 text-zinc-900`
                                                    : 'border-zinc-200 hover:border-zinc-300 text-zinc-700'
                                                }`}
                                        >
                                            <RadioGroupItem value={cond.value} id={cond.value} />
                                            <span className={`font-medium ${roomData.condition === cond.value ? cond.color : 'text-slate-700'}`}>
                                                {cond.label}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </RadioGroup>
                        </div>

                        {/* Photos */}
                        <div className="mb-6">
                            <Label className="mb-3 block">Photos ({roomData.photos.length})</Label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                                {roomData.photos.map((photo, idx) => (
                                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100">
                                        <img src={photo} alt={`${currentRoomData.label} ${idx + 1}`} className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleUploadPhoto(currentRoomData.key)}
                                disabled={uploading}
                            >
                                <Camera className="w-4 h-4 mr-2" />
                                {uploading ? 'Uploading...' : 'Add Photos'}
                            </Button>
                        </div>

                        {/* Notes */}
                        <div>
                            <Label htmlFor="notes" className="mb-2 block text-xs font-semibold text-zinc-700">Additional Notes</Label>
                            <Textarea
                                id="notes"
                                value={roomData.notes}
                                onChange={(e) => updateRoomData(currentRoomData.key, 'notes', e.target.value)}
                                placeholder="Any damages, issues, or special observations..."
                                rows={4}
                            />
                        </div>
                    </div>

                    {/* Video Upload */}
                    {currentRoom === ROOMS.length - 1 && (
                        <div className="sharp-card bg-white p-6 border border-transparent hover:border-zinc-900 mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="font-bold text-sm text-zinc-900">Walkthrough Video (Optional)</h3>
                                    <p className="text-xs text-zinc-500">Upload a video tour of the entire property</p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleUploadVideo}
                                    disabled={uploading}
                                >
                                    <Video className="w-4 h-4 mr-2" />
                                    {inspectionData.video_url ? 'Replace Video' : 'Upload Video'}
                                </Button>
                            </div>
                            {inspectionData.video_url && (
                                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                        <span className="text-sm text-emerald-700">Video uploaded successfully</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Overall Notes */}
                    {currentRoom === ROOMS.length - 1 && (
                        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm mb-6">
                            <Label htmlFor="overall" className="mb-2 block">Overall Inspection Notes</Label>
                            <Textarea
                                id="overall"
                                value={inspectionData.overall_notes}
                                onChange={(e) => setInspectionData(prev => ({ ...prev, overall_notes: e.target.value }))}
                                placeholder="Any general observations or concerns..."
                                rows={4}
                            />
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="flex gap-3">
                        {currentRoom > 0 && (
                            <Button variant="outline" onClick={handleBack} className="flex-1">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back
                            </Button>
                        )}
                        {currentRoom < ROOMS.length - 1 ? (
                            <Button
                                onClick={handleNext}
                                className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white"
                                disabled={!roomData.condition}
                            >
                                Next Room
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        ) : (
                            <Button
                                onClick={handleSubmit}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                                disabled={!roomData.condition || createInspectionMutation.isPending}
                            >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Submit Inspection
                            </Button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
