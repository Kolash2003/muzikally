import { requireAuth } from '../../authentication/actions'
import LogoutButton from './logoutButton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const HomePage = async () => {
    const session = await requireAuth();
  return (
    <div>
      Home Page
      {session.user && (
        <div className="flex items-center gap-2 m-2">
          <Avatar>
            <AvatarImage src={session.user.image ?? ""} alt={session.user.name ?? ""} />
            <AvatarFallback>{session.user.name?.charAt(0).toUpperCase() ?? "U"}</AvatarFallback>
          </Avatar>
          <LogoutButton userName={session.user.name} />
        </div>
      )}
    </div>
  )
}

export default HomePage
