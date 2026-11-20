'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { CameraIcon, Trash2Icon, ZoomInIcon, ZoomOutIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UserAvatar } from '@/components/user-avatar';
import { useI18n } from '@/i18n/client';
import {
  AVATAR_SIZE_PX,
  AVATAR_SOURCE_MAX_BYTES,
  AVATAR_SOURCE_TYPES,
  AVATAR_UPLOAD_MAX_BYTES,
} from '@/lib/avatar';
import { removeMyAvatar, uploadMyAvatar } from '../actions/user.actions';

/** Draws the chosen square of the image onto a small canvas. */
async function cropToBlob(src: string, area: Area): Promise<Blob> {
  const image = new Image();
  image.src = src;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SIZE_PX;
  canvas.height = AVATAR_SIZE_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    AVATAR_SIZE_PX,
    AVATAR_SIZE_PX,
  );

  const encode = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  // WebP where the browser can encode it (Safari can't: it returns PNG), else JPEG.
  const webp = await encode('image/webp', 0.85);
  if (webp?.type === 'image/webp') return webp;
  const jpeg = await encode('image/jpeg', 0.88);
  if (!jpeg) throw new Error('encode');
  return jpeg;
}

/**
 * My profile: the current picture (or initials), with buttons to choose a new
 * one (cropped to a square first) or remove it. Saves immediately.
 */
export function AvatarPicker({ name, src }: { name: string; src: string | null }) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  // Free the picked file's object URL when it's replaced or the picker closes.
  useEffect(() => () => void (source && URL.revokeObjectURL(source)), [source]);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!AVATAR_SOURCE_TYPES.includes(file.type)) {
      toast.error(t.validation.avatarType);
      return;
    }
    if (file.size > AVATAR_SOURCE_MAX_BYTES) {
      toast.error(t.validation.avatarSourceSize);
      return;
    }
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setArea(null);
    setSource(URL.createObjectURL(file));
  };

  const onCropComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), []);

  const save = async () => {
    if (!source || !area) return;
    setBusy(true);
    try {
      const blob = await cropToBlob(source, area);
      if (blob.size > AVATAR_UPLOAD_MAX_BYTES) {
        toast.error(t.validation.avatarSize);
        return;
      }
      const data = new FormData();
      data.set('file', new File([blob], 'avatar', { type: blob.type }));
      const result = await uploadMyAvatar(data);
      if (result.success) {
        toast.success(t.profile.avatarSaved);
        setSource(null);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error(t.errors.avatarUpload);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    const result = await removeMyAvatar();
    setBusy(false);
    if (result.success) toast.success(t.profile.avatarRemoved);
    else toast.error(result.message);
  };

  return (
    <div className='flex items-center gap-4'>
      <UserAvatar name={name} src={src} className='size-16' fallbackClassName='text-lg' />
      <div className='flex flex-wrap gap-2'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <CameraIcon />
          {src ? t.profile.changeAvatar : t.profile.addAvatar}
        </Button>
        {src && (
          <Button type='button' variant='ghost' size='sm' disabled={busy} onClick={remove}>
            <Trash2Icon />
            {t.profile.removeAvatar}
          </Button>
        )}
        <p className='w-full text-xs text-muted-foreground'>{t.profile.avatarHint}</p>
      </div>
      <input
        ref={inputRef}
        type='file'
        accept={AVATAR_SOURCE_TYPES.join(',')}
        className='hidden'
        onChange={onPick}
      />

      <Dialog open={!!source} onOpenChange={(open) => !open && !busy && setSource(null)}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>{t.profile.cropTitle}</DialogTitle>
            <DialogDescription>{t.profile.cropDescription}</DialogDescription>
          </DialogHeader>
          <div className='relative aspect-square w-full overflow-hidden rounded-md bg-muted'>
            {source && (
              <Cropper
                image={source}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape='round'
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>
          <label className='flex items-center gap-3 text-muted-foreground'>
            <ZoomOutIcon className='size-4 shrink-0' aria-hidden />
            <span className='sr-only'>{t.profile.zoom}</span>
            <input
              type='range'
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className='w-full accent-primary'
            />
            <ZoomInIcon className='size-4 shrink-0' aria-hidden />
          </label>
          <DialogFooter>
            <Button variant='outline' disabled={busy} onClick={() => setSource(null)}>
              {t.common.cancel}
            </Button>
            <Button disabled={busy || !area} onClick={save}>
              {busy ? t.common.saving : t.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
