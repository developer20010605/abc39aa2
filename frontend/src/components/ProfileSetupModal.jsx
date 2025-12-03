import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, User, CheckCircle2 } from 'lucide-react';
import { useSaveCallerUserProfile } from '../hooks/useQueries';

export default function ProfileSetupModal({ open }) {
  const [name, setName] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const saveProfile = useSaveCallerUserProfile();

  useEffect(() => {
    if (!open) {
      setName('');
      setShowSuccess(false);
    }
  }, [open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      return;
    }

    saveProfile.mutate(
      { name: name.trim() },
      {
        onSuccess: () => {
          setShowSuccess(true);
        },
        onError: (error) => {
          console.error('[ProfileSetupModal] Error saving profile:', error);
        }
      }
    );
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={() => {}}
    >
      <DialogContent 
        className="sm:max-w-md" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Setup
          </DialogTitle>
          <DialogDescription>Please enter your name to continue</DialogDescription>
        </DialogHeader>

        {showSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 animate-in zoom-in duration-300" />
            <p className="text-lg font-medium text-green-600">Successfully saved!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoFocus
                required
                disabled={saveProfile.isPending}
                minLength={1}
                maxLength={100}
              />
            </div>
            <Button 
              type="submit" 
              disabled={saveProfile.isPending || !name.trim()} 
              className="w-full"
            >
              {saveProfile.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
