import ReturnPrint from '../../../ReturnPrint';

export default function Page({ params }: { params: { id: string } }) {
  return <ReturnPrint id={params.id} kind="order" />;
}
