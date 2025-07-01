import { useState } from 'react'
import './App.css'
import PlayerInfo from './PlayerInfo'
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

  }
  return (
    <>
      
      <title>Brawl Analytics</title>
      
      <div>
        <img src="/img/bslogo.png"/>
        
        <h1 className='Title'>
          Brawl Analytics
        </h1>
      </div>
      <div>

        <label>Enter your name: </label>
        <input type="text" 
        name="playerid" 
        placeholder='PlayerID'
        onChange={onChangeHandler}
        onKeyDown={onEnter}
        value={name}></input>
      </div>
      <PlayerInfo playerID={name} show={show}></PlayerInfo>

      
    </>
  )
}

export default App
