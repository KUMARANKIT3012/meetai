import { SignInView } from "@/modules/auth/ui/views/sign-in-view";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

const Page = async () => {

  const session = await auth.api.getSession({
      headers: await headers(),
    });
  
    if (!!session) {
      redirect("/");
    }
  return <SignInView/>
}

export default Page;

// http://localhost:3001/sign-in

// Note - thats how u create nested routes 
// Note - check layout.tsx in auth folder 
// make it (auth)