import { useState } from 'react'
import './App.css'
import PlayerInfo from './components/player/PlayerInfo.tsx'
function App() {
  const [name, setName] = useState<string>("")
  const [show, setShow] = useState<boolean>(false)
  const onChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };
  const onEnter = (enter: React.KeyboardEvent<HTMLInputElement>) => {
    if(enter.key == "Enter"){
      enter.preventDefault()
      setShow(true)
    }
    // call api
  }
  /*
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
            <button type="button" className="px-12 hover:underline">
              Login
            </button>
            <button type="button" className="px-12 hover:underline">
              About
            </button>
          </div>

        </div>
      </header>
      */
  return (
    <>
      <title>Brawl Analytics</title>
      

      <div className='flex flex-col min-h-[75vh] justify-center items-center'>
        
        <h1 className='p-4 text-white font-hello font-medium'>Enter your ID.</h1>
        <br />
        <input 
        className='w-64 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
        type="text" 
        name="playerid" 
        placeholder='#'
        onChange={onChangeHandler}
        onKeyDown={onEnter}
        value={name}></input>
      </div>
  
      <PlayerInfo playerID={name} show={show}></PlayerInfo>

      
    </>
  )
}

export default App
