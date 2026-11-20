import { NextResponse, type NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { AVATAR_FILE_RE } from '@/lib/avatar';
import { AVATARS_BUCKET, createAdminClient } from '@/lib/supabase/admin';

const SIGNED_SECONDS = 3600;

/**
 * Serves a profile picture to any signed-in user. Avatars live in a private
 * bucket; only files currently set on a profile are served. Each upload gets
 * a new file name, so the redirect can be cached a while.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ file: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const { file } = await params;
  const owner = AVATAR_FILE_RE.test(file)
    ? await prisma.user.findFirst({ where: { avatarPath: file }, select: { id: true } })
    : null;
  if (!owner) return new NextResponse('Not found', { status: 404 });

  const { data, error } = await createAdminClient()
    .storage.from(AVATARS_BUCKET)
    .createSignedUrl(file, SIGNED_SECONDS);
  if (error || !data) return new NextResponse('Could not open the image', { status: 502 });

  const response = NextResponse.redirect(data.signedUrl);
  // Shorter than the signed URL's lifetime, so a cached redirect still works.
  response.headers.set('Cache-Control', `private, max-age=${SIGNED_SECONDS - 600}`);
  return response;
}
