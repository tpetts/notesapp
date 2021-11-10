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
import { onUpdateNote } from './graphql/subscriptions';

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


    case 'UPDATE_NOTES':
      /**
       * Create a new constant called updateIndex and assign it a value that will
       * take the current state of the notes listed, and find the index by the id 
       * property of the note on the page and check to see if the note's id is equal 
       * in both value and type to the action.id of the reducer function.
       */
      const updateIndex = state.notes.findIndex(n => n.id === action.updatedNote)
      console.log(updateIndex);
      console.log(action.updatedNote);
      /**  
       * The notes that the user is seeing on the page
       */
      const updatedNotes = [...state.notes]
      console.log(updatedNotes);
      // Show me what the notes constant is holding in the console
      //console.log(updatedNotes);
      /**
       * setting the note at index(...xyz) to the opposite of what it was before
       */
      updatedNotes[updateIndex].completed = !updatedNotes[updateIndex].completed
      
      /**
       * Return all the previous notes, including the current notes and...
       * perform the action on the active note, while the page isn't loading.
       */
      return { ...state, notes: updatedNotes, loading: false }
      // end of UPDATE_NOTES case




    case 'ADD_NOTE':
      return { ...state, notes: [action.note, ...state.notes]}
    case 'REMOVE_NOTE':
      const index = state.notes.findIndex(n => n.id === action.id)
      //console.log(index);
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
  // note being passed to updateNote to be scrutinized in the index below
  const updateNote = async(note) => {
    // work through each of these to find out what they do

    // find the index of the note we are messing with by comparing the note id to the current list of notes
    const index = state.notes.findIndex(n => n.id === note.id)
    // create variable called notes, assign the value of an array that is spreading in all other current notes
    const notes = [...state.notes]
    // take the index of the new variable notes from above and interrogate if it is marked completed or not completed
    notes[index].completed = !note.completed
    // call the reducer of SET_NOTES, and pass it the newly changed notes from 2 lines above
    dispatch({ type: 'SET_NOTES', notes})
    // try executing this try statement, it should work
    try {
      // wait for the graphql API
      await API.graphql({
        // make a query to UpdateNote,
        query: UpdateNote,
        // with the input variables of id, and completed notes index array
        variables: { input: { id: note.id, completed: notes[index].completed } }
      })
      // Show me that the note was updated in the console.
      console.log('note successfully updated!')
      // otherwise, execute this catch statement because the try statement didn't work
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
          //console.log(note);
          //console.log("I made it to line 138 !");
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
          const noteId = noteData.value.data.onDeleteNote.id
          //console.log(id);
          //console.log(index);
          //console.log(notes);
        
          // need to update the user interface
          dispatch({ type: 'REMOVE_NOTE', id: noteId })
          //console.log("I made it into the next subscription on line 158!");
        }
      })

      const updateSubscription = API.graphql({
        query: onUpdateNote
      })

        .subscribe({
          next: noteData => {
            const noteId = noteData.value.data.onUpdateNote.id
            console.log(noteId);

            dispatch({ type: 'UPDATE_NOTES' , updatedNote: noteId})
          }
        })

      return () => {
        createSubscription.unsubscribe()
        deleteSubscription.unsubscribe()
        updateSubscription.unsubscribe()

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
