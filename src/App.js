// import logo from './logo.svg';
import './App.css';
import React, {useEffect, useReducer} from 'react';
import { API } from 'aws-amplify';
import { List } from 'antd';
import 'antd/dist/antd.css';
import { listNotes } from './graphql/queries';

const initialState = {
  notes: [],
  loading: true,
  error: false,
  form: { name: '', description: '' }
}

// Creating the styles for the components for this app
const styles = {
  container: {padding: 20},
  input: {marginBottom: 10},
  item: { textAlign: 'left' },
  p: { color: '#1890ff' }
}

function reducer(state, action) {
  switch(action.type) {
    case 'SET_NOTES':
      return { ...state, notes: action.notes, loading: false }
    case 'ERROR':
      return { ...state, loading: false, error: true }
    default:
      return { ...state};
  }
};

export default function App() {
  // const initialState = { notes: [] };

  // update the main App function to create the state and dispatch variables by calling useReducer and passing in the reducer and initialState:
  const [state, dispatch] = useReducer(reducer, initialState)

  // create a fetchNotes function (in the main App function) that will call the AppSync API and set the notes array once the API call is successful:

  const fetchNotes = async() => {
    try {
      const notesData = await API.graphql({
        query: listNotes
      });
      dispatch({ type: 'SET_NOTES', notes: notesData.data.listNotes.items });
    } catch (err) {
      console.log(err);
      dispatch({ type: 'ERROR' });
    }
  };

  // Now, invoke the fetchNotes function by implementing the useEffect hook (in the main App function):
  useEffect(() => {
    fetchNotes();
  }, []);

  // defining renderItem
  function renderItem(Item) {
    return (
      <List.Item style={styles.item}>
        <List.Item.Meta
          title={Item.name}
          description={Item.description}
        />
      </List.Item>
    )
  };

  return (
    //return the main UI for the component
    <div style={styles.container}>
      <List 
        loading={state.loading}
        dataSource={state.notes}
        renderItem={renderItem}
      />


      {/* <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header> */}
    </div>
  );
}

// export default App;
