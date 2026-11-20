'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/i18n/client';
import { createTopic } from '../actions/forum.actions';
import type { ForumCategoryItem } from '../schemas';
import { TopicForm } from './topic-form';

export function NewTopic({
  categories,
  categoryId,
}: {
  categories: ForumCategoryItem[];
  categoryId: string;
}) {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <div className='mx-auto w-full max-w-4xl px-4 lg:px-6'>
      <Card>
        <CardHeader>
          <CardTitle>{t.forum.newTopicTitle}</CardTitle>
          <CardDescription>{t.forum.newTopicDescription}</CardDescription>
        </CardHeader>
        <div className='px-4'>
          <TopicForm
            categories={categories}
            defaultValues={{ categoryId, title: '', body: '' }}
            submitLabel={t.forum.createTopic}
            onCancel={() => router.back()}
            onSubmit={async (values) => {
              const result = await createTopic(values);
              if (!result.success) return result.message;
              toast.success(t.forum.created);
              router.push(`/main/forum/${result.id}`);
            }}
          />
        </div>
      </Card>
    </div>
  );
}
