import RegisterClient from "./RegisterClient";

export default function RegisterPage() {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  
  return <RegisterClient clientId={clientId} />;
}
