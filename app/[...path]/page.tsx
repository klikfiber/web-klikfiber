import Store from '@/components/store';
import { Suspense } from 'react';
export default function Page() {
  return (
    <Suspense>
      <Store />
    </Suspense>
  );
}
