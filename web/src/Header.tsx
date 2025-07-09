import { Link } from "react-router-dom";

const Header = () =>{
  return(
    <header className='bg-radial-[at_95%_5%] from-nice_purple/50 from-5% to-gray-900'>
      <div className="flex justify-between items-center">
        <div className='flex justify-between items-center'>
          <div className="flex p-4">
            <img 
              src="/img/bslogo.png"
              className="object-contain "
            />
          </div>
          <h1 className='font-hello text-3xl font-bold text-purple-50'>
            Brawl Analytics
          </h1>
        </div>
        <div className="flex mr-4 space-x-2">
            <Link to = "/">
              <button type="button" className="px-12 hover:underline">
                Home
              </button>
            </Link>
            <Link to = "/login">
              <button type="button" className="px-12 hover:underline">
                Login
              </button>
            </Link>
            <Link to = "/about">
              <button type="button" className="px-12 hover:underline">
                About
              </button>
            </Link>
        </div>

      </div>
    </header>
  )
}

export default Header;