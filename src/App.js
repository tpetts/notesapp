// import logo from './logo.svg';
import './App.css';
import React, {useEffect, useReducer} from 'react';
import { API } from 'aws-amplify';
import { List, Input, Button } from 'antd';
import 'antd/dist/antd.css';
import { v4 as uuid } from 'uuid';
import { listNotes } from './graphql/queries';
import { 
          createNote as CreateNote,
          deleteNote as DeleteNote,
          updateNote as UpdateNote
        } from './graphql/mutations';
import { onCreateNote } from './graphql/subscriptions';
import { onDeleteNote } from './graphql/subscriptions';

const CLIENT_ID =  uuid();

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
    case 'ADD_NOTE':
      return { ...state, notes: [action.note, ...state.notes]}
    case 'REMOVE_NOTE':
      const index = state.notes.findIndex(n => n.id === action.id)
      const newNotes = [
        ...state.notes.slice(0, index), // filter vs slice
        ...state.notes.slice(index + 1)
      ];
      return { ...state, notes: newNotes }
    case 'RESET_FORM':
      return { ...state, form: initialState.form }
    case 'SET_INPUT':
      return { ...state, form: { ...state.form, [action.name]: action.value } }
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

  const createNote = async() => {
    const { form } = state
    if (!form.name || !form.description) {
       return alert('please enter a name and description')
    }
    const note = { ...form, clientId: CLIENT_ID, completed: false, id: uuid() }
    dispatch({ type: 'ADD_NOTE', note })
    dispatch({ type: 'RESET_FORM' })
    try {
      await API.graphql({
        query: CreateNote,
        variables: { input: note }
      })
      console.log('successfully created note!')
    } catch (err) {
      console.log("error: ", err)
    }
  }

  const deleteNote = async({ id }) => {
    // updating the frontend
    const index = state.notes.findIndex(n => n.id === id)
    const notes = [
      ...state.notes.slice(0, index), // filter vs slice
      ...state.notes.slice(index + 1)
    ];
    // updating the backend
    dispatch({ type: 'SET_NOTES', notes })
    try {
      await API.graphql({
        query: DeleteNote,
        variables: { input: { id } }
      })
      console.log('successfully deleted note!')
      } catch (err) {
        console.error(err)
    }
  };

  const updateNote = async(note) => {
    const index = state.notes.findIndex(n => n.id === note.id)
    const notes = [...state.notes]
    notes[index].completed = !note.completed
    dispatch({ type: 'SET_NOTES', notes})
    try {
      await API.graphql({
        query: UpdateNote,
        variables: { input: { id: note.id, completed: notes[index].completed } }
      })
      console.log('note successfully updated!')
    } catch (err) {
      console.error(err)
    }
  };

  function onChange(e) {
    dispatch({ type: 'SET_INPUT', name: e.target.name, value: e.target.value })
  }

  // Now, invoke the fetchNotes function by implementing the useEffect hook (in the main App function):
  useEffect(() => {
    fetchNotes();




    // onCreateNote subscription
    const createSubscription = API.graphql({
      query: onCreateNote
    })
      .subscribe({
        next: noteData => {
          const note = noteData.value.data.onCreateNote
          console.log(note);
          console.log("I made it to line 138 !");
          // if its a note that I created, don't dispatch it
          if (CLIENT_ID === note.clientId) return
          // dispatch = else condition
          dispatch({ type: 'ADD_NOTE', note })
        }
      })
      




      // onDeleteNote subscription
    // making a query to the graphql API
    const deleteSubscription = API.graphql({
      query: onDeleteNote
    })

      .subscribe({
        next: noteData => {
          const note = noteData.value.data.onDeleteNote
          console.log(note);

          const index = state.notes.findIndex(n => n.noteData === n.noteData)
          const notes = [
            ...state.notes.filter(0, index), // filter vs slice
            ...state.notes.filter(index + 1)
          ];
          //console.log(index);
          //console.log(notes);
          
          if (CLIENT_ID === note.clientId) return

          // need to update the user interface
          //dispatch({ type: 'SET_NOTES', notes })
          console.log("I made it into the next subscription on line 158!");
        }
      })

      return () => {
        createSubscription.unsubscribe()
        deleteSubscription.unsubscribe()
      }


  }, []); // closing useEffect statement

  // defining renderItem
  function renderItem(Item) {
    return (
      <List.Item 
        style={styles.item}
        actions={[
        <p style={styles.p} onClick={() => deleteNote(Item)}>Delete</p>,
        <p style={styles.p} onClick={() => updateNote(Item)}>
      {Item.completed ? 'completed' : 'mark completed'}
    </p>
  ]}
      >
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

      <Input
        onChange={onChange}
        value={state.form.name}
        placeholder="Note Name"
        name='name'
        style={styles.input}
      />
      <Input
        onChange={onChange}
        value={state.form.description}
        placeholder="Note description"
        name='description'
        style={styles.input}
      />
      <Button
        onClick={createNote}
        type="primary"
      >
        Create Note
      </Button>

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
