import express, { Response, Request, request } from "express";
import dotenv from "dotenv";
import http from "http";
import cors from 'cors'; // Import the 'cors' middleware
import { MessageEvent, SocketId } from "./types/socket";
import { USER_CONNECTION_STATUS, User } from "./types/user";
import bodyParser from 'body-parser';
import { Server } from "socket.io";
import path from "path";
import axios from 'axios'; // Import Axios for making HTTP requests
const corsAnywhere = require('cors-anywhere');


const host = process.env.HOST || '0.0.0.0';
const port = process.env.PORT || 8080;

corsAnywhere.createServer({
  originWhitelist: [], // Allow all origins
  requireHeader: ['origin', 'x-requested-with'],
  removeHeaders: ['cookie', 'cookie2']
}).listen(port, host, () => {
  console.log(`Running CORS Anywhere on ${host}:${port}`);
});

dotenv.config();

const app = express();
app.use(bodyParser.json());

// Use the 'cors' middleware
app.use(cors());

app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // Serve static files

app.use('/proxy', (req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
	res.header('Access-Control-Allow-Headers', 'Content-Type');
	next();
  });
  
app.use('/proxy', async (req, res) => {
	const url = 'https://api.google.com' + req.url;
	try {
	  const response = await axios({
		method: req.method,
		url: url,
		headers: {
		  'Content-Type': 'application/json',
		  'Authorization': req.headers.authorization
		},
		data: req.method === 'GET' || req.method === 'HEAD' ? null : req.body
	  });
  
	  res.status(response.status).json(response.data);
	} catch (error) {
	  res.status(500).json({ error: 'Something went wrong' });
	}
  });
  
  

app.post('/gemini/messages', async (req, res) => {
    try {
        // Make a request to the Gemini API endpoint
        const response = await axios.post('https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=AIzaSyCcKPTQXsaiNwYDDBF5dwu89J_nAEp8GwE', req.body);
        res.json(response.data);
    } catch (error) {
        res.json(error);
    }
});
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow requests from any origin
    },
});

app.use(express.json())


app.use(express.static(path.join(__dirname, "public"))) // Serve static files

app.get("/api/code", (req: Request, res: Response) => {
    try {
        // Check if the client sent code in the request body
        const codeData = req.body.code;

        if (!codeData) {
            // If code data is missing, send a 400 Bad Request response
            return res.status(400).json({ error: "Code data is missing in the request" });
        }

        // Send the code data as a JSON response
        res.json({ code: codeData });
    } catch (error) {
        // Handle errors gracefully
        console.error("Error fetching code:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
axios.post('https://cors-anywhere.herokuapp.com/https://api.google.com/gemini/v1/messages')
    .then((response: { data: any }) => {
        console.log(response.data);
    })
    .catch((error: any) => {
        console.error(error);
    });

let userSocketMap: User[] = []

// Function to get all users in a room
function getUsersInRoom(roomId: string): User[] {
	return userSocketMap.filter((user) => user.roomId == roomId)
}

// Function to get room id by socket id
function getRoomId(socketId: SocketId): string | null {
	const roomId = userSocketMap.find(
		(user) => user.socketId === socketId
	)?.roomId

	if (!roomId) {
		console.error("Room ID is undefined for socket ID:", socketId)
		return null
	}
	return roomId
}

function getUserBySocketId(socketId: SocketId): User | null {
	const user = userSocketMap.find((user) => user.socketId === socketId)
	if (!user) {
		console.error("User not found for socket ID:", socketId)
		return null
	}
	return user
}

io.on("connection", (socket) => {
	// Handle user actions
	socket.on(MessageEvent.JOIN_REQUEST, ({ roomId, username }) => {
		// Check is username exist in the room
		const isUsernameExist = getUsersInRoom(roomId).filter(
			(u) => u.username === username
		)
		if (isUsernameExist.length > 0) {
			io.to(socket.id).emit(MessageEvent.USERNAME_EXISTS)
			return
		}

		const user = {
			username,
			roomId,
			status: USER_CONNECTION_STATUS.ONLINE,
			cursorPosition: 0,
			typing: false,
			socketId: socket.id,
			currentFile: null,
		}
		userSocketMap.push(user)
		socket.join(roomId)
		socket.broadcast.to(roomId).emit(MessageEvent.USER_JOINED, { user })
		const users = getUsersInRoom(roomId)
		io.to(socket.id).emit(MessageEvent.JOIN_ACCEPTED, { user, users })
	})

	socket.on("disconnecting", () => {
		const user = getUserBySocketId(socket.id)
		if (!user) return
		const roomId = user.roomId
		socket.broadcast
			.to(roomId)
			.emit(MessageEvent.USER_DISCONNECTED, { user })
		userSocketMap = userSocketMap.filter((u) => u.socketId !== socket.id)
		socket.leave(roomId)
	})

	// Handle file actions
	socket.on(MessageEvent.SYNC_FILES, ({ files, currentFile, socketId }) => {
		io.to(socketId).emit(MessageEvent.SYNC_FILES, {
			files,
			currentFile,
		})
	})

	socket.on(MessageEvent.FILE_CREATED, ({ file }) => {
		const roomId = getRoomId(socket.id)
		if (!roomId) return
		socket.broadcast.to(roomId).emit(MessageEvent.FILE_CREATED, { file })
	})

	socket.on(MessageEvent.FILE_UPDATED, ({ file }) => {
		const roomId = getRoomId(socket.id)
		if (!roomId) return
		socket.broadcast.to(roomId).emit(MessageEvent.FILE_UPDATED, { file })
	})

	socket.on(MessageEvent.FILE_RENAMED, ({ file }) => {
		const roomId = getRoomId(socket.id)
		if (!roomId) return
		socket.broadcast.to(roomId).emit(MessageEvent.FILE_RENAMED, { file })
	})

	socket.on(MessageEvent.FILE_DELETED, ({ id }) => {
		const roomId = getRoomId(socket.id)
		if (!roomId) return
		socket.broadcast.to(roomId).emit(MessageEvent.FILE_DELETED, { id })
	})

	// Handle user status
	socket.on(MessageEvent.USER_OFFLINE, ({ socketId }) => {
		userSocketMap = userSocketMap.map((user) => {
			if (user.socketId === socketId) {
				return { ...user, status: USER_CONNECTION_STATUS.OFFLINE }
			}
			return user
		})
		const roomId = getRoomId(socketId)
		if (!roomId) return
		socket.broadcast
			.to(roomId)
			.emit(MessageEvent.USER_OFFLINE, { socketId })
	})

	socket.on(MessageEvent.USER_ONLINE, ({ socketId }) => {
		userSocketMap = userSocketMap.map((user) => {
			if (user.socketId === socketId) {
				return { ...user, status: USER_CONNECTION_STATUS.ONLINE }
			}
			return user
		})
		const roomId = getRoomId(socketId)
		if (!roomId) return
		socket.broadcast.to(roomId).emit(MessageEvent.USER_ONLINE, { socketId })
	})

	// Handle chat actions
	socket.on(MessageEvent.SEND_MESSAGE, ({ message }) => {
		const roomId = getRoomId(socket.id)
		if (!roomId) return
		socket.broadcast
			.to(roomId)
			.emit(MessageEvent.RECEIVE_MESSAGE, { message })
	})

	// Handle cursor position
	socket.on(MessageEvent.TYPING_START, ({ cursorPosition }) => {
		userSocketMap = userSocketMap.map((user) => {
			if (user.socketId === socket.id) {
				return { ...user, typing: true, cursorPosition }
			}
			return user
		})
		const user = getUserBySocketId(socket.id)
		if (!user) return
		const roomId = user.roomId
		socket.broadcast.to(roomId).emit(MessageEvent.TYPING_START, { user })
	})

	socket.on(MessageEvent.TYPING_PAUSE, () => {
		userSocketMap = userSocketMap.map((user) => {
			if (user.socketId === socket.id) {
				return { ...user, typing: false }
			}
			return user
		})
		const user = getUserBySocketId(socket.id)
		if (!user) return
		const roomId = user.roomId
		socket.broadcast.to(roomId).emit(MessageEvent.TYPING_PAUSE, { user })
	})

	socket.on(MessageEvent.REQUEST_DRAWING, () => {
		const roomId = getRoomId(socket.id)
		if (!roomId) return
		socket.broadcast
			.to(roomId)
			.emit(MessageEvent.REQUEST_DRAWING, { socketId: socket.id })
	})

	socket.on(MessageEvent.SYNC_DRAWING, ({ drawingData, socketId }) => {
		socket.broadcast
			.to(socketId)
			.emit(MessageEvent.SYNC_DRAWING, { drawingData })
	})

	socket.on(MessageEvent.DRAWING_UPDATE, ({ snapshot }) => {
		const roomId = getRoomId(socket.id)
		if (!roomId) return
		socket.broadcast.to(roomId).emit(MessageEvent.DRAWING_UPDATE, {
			snapshot,
		})
	})
})

const PORT = process.env.PORT || 3000

app.get("/", (req: Request, res: Response) => {
	// Send the index.html file
	res.sendFile(path.join(__dirname, "..", "public", "index.html"))
})

app.use((req, res, next) => {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
  });



  axios('https://allorigins.win/raw?url=https://api.google.com/gemini/v1/messages', {
	// Replace with the actual data you want to send
	data: {
	  foo: 'bar'
	}
  })
  .then((response: any) => {
	console.log(response);
  })
  .catch((error: any) => {
	console.error(error);
  });

server.listen(PORT, () => {
	console.log(`Listening on port ${PORT}`)
})
