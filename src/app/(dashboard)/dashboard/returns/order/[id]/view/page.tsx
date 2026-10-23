import ReturnView from '../../../ReturnView';

export default function Page({ params }: { params: { id: string } }) {
  return <ReturnView id={params.id} kind="order" />;
}
