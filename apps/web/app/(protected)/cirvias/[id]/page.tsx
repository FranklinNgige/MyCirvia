import { redirect } from 'next/navigation';

export default function CirviaPageRedirect({ params }: { params: { id: string } }) {
  redirect(`/cirvias/${params.id}/feed`);
}
