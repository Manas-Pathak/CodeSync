import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import ACTIONS from '../Actions';
import Client from '../components/Client';
import Editor from '../components/Editor';
import { initSocket } from '../socket';
import {
    useLocation,
    useNavigate,
    useParams,
    Navigate,
} from 'react-router-dom';

const EditorPage = () => {
    const socketRef = useRef(null);
    const codeRef = useRef(null);
    const location = useLocation();
    const { roomId } = useParams();  //to get id
    const reactNavigate = useNavigate();
    const [clients, setClients] = useState([]);

    useEffect(() => {
        const initializeSocket = async () => {
            try {
                socketRef.current = await initSocket();
                
                // Handle socket connection errors
                socketRef.current.on('connect_error', handleSocketError);
                socketRef.current.on('connect_timeout', handleSocketError);
                socketRef.current.on('error', handleSocketError);

                // Handle joining room
                socketRef.current.emit(ACTIONS.JOIN, {
                    roomId,
                    username: location.state?.username,
                });
                    //listening for joined event
                socketRef.current.on(ACTIONS.JOINED, handleJoinRoom);
                    //listening for disconnectioning event
                socketRef.current.on(ACTIONS.DISCONNECTED, handleDisconnected);
            } catch (error) {
                handleSocketError(error);
            }
        };

        initializeSocket();

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current.off(ACTIONS.JOINED, handleJoinRoom);
                socketRef.current.off(ACTIONS.DISCONNECTED, handleDisconnected);
                socketRef.current.off('connect_error', handleSocketError);
                socketRef.current.off('connect_timeout', handleSocketError);
                socketRef.current.off('error', handleSocketError);
            }
        };
    }, [roomId, location.state]);

    const handleSocketError = (err) => {
        console.error('Socket error:', err);
        toast.error('Socket connection failed, please try again later.');
        reactNavigate('/');
    };

    const handleJoinRoom = ({ clients, username, socketId }) => {
        if (username !== location.state?.username) {
            toast.success(`${username} joined the room.`);
        }
        setClients(clients);
        syncCodeWithServer(socketId);
    };

    const handleDisconnected = ({ socketId, username }) => {
        toast.success(`${username} left the room.`);
        setClients((prevClients) => prevClients.filter((client) => client.socketId !== socketId));
    };

    const syncCodeWithServer = (socketId) => {
        socketRef.current.emit(ACTIONS.SYNC_CODE, {
            code: codeRef.current,
            socketId,
        });
    };

    const copyRoomId = async () => {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success('Room ID has been copied to your clipboard');
        } catch (err) {
            toast.error('Could not copy the Room ID');
            console.error(err);
        }
    };

    const leaveRoom = () => {
        reactNavigate('/');
    };

    if (!location.state) {
        return <Navigate to="/" />;
    }

    return (
        <div className="mainWrap">
            <div className="aside">
                <div className="asideInner">
                    <div className="logo">
                        <img className="logoImage" src="/code-sync.png" alt="logo" />
                    </div>
                    <h3>Connected</h3>
                    <div className="clientsList">
                        {clients.map((client) => (
                            <Client key={client.socketId} username={client.username} />
                        ))}
                    </div>
                </div>
                <button className="btn copyBtn" onClick={copyRoomId}>
                    Copy ROOM ID
                </button>
                <button className="btn leaveBtn" onClick={leaveRoom}>
                    Leave
                </button>
            </div>
            <div className="editorWrap">
                <Editor
                    socketRef={socketRef}
                    roomId={roomId}
                    onCodeChange={(code) => {
                        codeRef.current = code;
                    }}
                />
            </div>
        </div>
    );
};

export default EditorPage;
