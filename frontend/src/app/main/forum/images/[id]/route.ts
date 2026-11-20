import { NextResponse, type NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient, FORUM_BUCKET } from '@/lib/supabase/admin';
import { canSee } from '@/features/forum/access';

/**
 * Serves a forum image. Images live in a private bucket: once attached to a
 * topic they follow its category's visibility; before that (a draft) only the
 * uploader can see them. Redirects to a short-lived signed URL.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const { id } = await params;
  const image = /^[0-9a-f-]{36}$/.test(id)
    ? await prisma.forumImage.findUnique({
        where: { id },
        include: {
          topic: { select: { category: { select: { visibility: true } } } },
        },
      })
    : null;
  const allowed =
    !!image &&
    (image.topic ? canSee(user, image.topic.category.visibility) : image.uploaderId === user.id);
  if (!image || !allowed) return new NextResponse('Not found', { status: 404 });

  const { data, error } = await createAdminClient()
    .storage.from(FORUM_BUCKET)
    .createSignedUrl(image.path, 300);
  if (error || !data) return new NextResponse('Could not open the image', { status: 502 });

  const response = NextResponse.redirect(data.signedUrl);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
