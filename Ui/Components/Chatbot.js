import React, { useState, useRef, useEffect, useMemo } from "react";
import { DotWave } from '@uiball/loaders';
import axios from "axios";
//import configData from '../../Head/Ui/constants/config.json';
//import configData from '../Constants/config.json';
import '../../../App.css';
import '@fortawesome/fontawesome-free/css/all.css';

//import botIcon from '../Ui/chatbot.png';


const mimeType = "audio/webm";

export default function Chatbot() {
    const [sessionType, setSessionType] = useState('');
    const [hide, setHide] = useState(true)
    var [questions, setQuestions] = useState([]); // Array to store questions
    var [aiQues, setAiQues] = useState([]);
    const [questionIds, setQuestionId] = useState([]);
    const [quesNumber, setQuesNumber] = useState(1);
    const [selectedQuestion, setSelectedQuestion] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    // State variables
    const [permission, setPermission] = useState(false);
    const mediaRecorder = useRef(null);
    const [recordingStatus, setRecordingStatus] = useState("inactive");
    const [stream, setStream] = useState(null);
    const [audioChunks, setAudioChunks] = useState([]);
    const [audio, setAudio] = useState(null);
    const [showAudio, setShowAudio] = useState(false);
    const [notfound, setNotfound] = useState([])
    const [inputValue, setInputValue] = useState('');
    const refer = React.createRef();

    //const [remainingTime, setRemainingTime] = useState(configData.SessionDuration);
    const timerIdRef = useRef(null);

    // Feedback-related state variables
    const [showFeedback, setShowFeedback] = useState(false);
    const [showGetFeedbackButton, setShowGetFeedbackButton] = useState(false);
    const [feedbackdivMaxHeight, setFeedbackdivMaxHeight] = useState("350px");
    const [feedbackHistory, setFeedbackHistory] = useState([]); // Store feedback history
    const [sttHistory, setSTTHistory] = useState([]); // Store STT history

    // State variables for loading and UI elements
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [toggleState, setToggleState] = useState("Expand");
    const [sttLoading, setSttLoading] = useState(false);
    const [botLoading, setBotLoading] = useState(false);
    const [showChatBot, setShowChatBot] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [attemptNumber, setAttemptNumber] = useState(0);
    const [feedbacksNumber, setFeedbacksNumber] = useState(0);
    const [tabSwitchingCount, setTabSwitchingCount] = useState(0);
    const [tabSwitchingConfig, setTabSwitchingConfig] = useState(false); // Used for tab switching config depending on mode
    const [answer, setAnswer] = useState([])
    const buttonClass = "border border-transparent text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500";


    // State to control flash messages visibility
    const [flashMessage, setFlashMessage] = useState({
        text: "",
        success: false,
        failure: false,
    });
    useEffect(() => {
        toggleChatBot();
    }, []);

    const [endFlag, setEndFlag] = useState(1);
    const [resultsConfig, setResultsConfig] = useState(false); // Used for results config depending on mode

    // Function to fetch questions from the /getquestionsfromapi route

    const fetchQuestionsFromAPI = async () => {
        try {
            setQuestions([])
            setBotLoading(true);
            const response = await fetch("/skillPractice/getquestionsfromapi", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (response.status === 200) {
                const { questions: fetchedQuestions, questionIds: fetchedQuestionIds } = await response.json();

                // Set the fetched questions into the state
                setAnswer(fetchedQuestions);
                console.log("fetched question is ", questions);

                setQuestionId(questionIds);
                console.log("fetched questionid is ", questionIds);


                // Set the fetched questions into the state
                //setAnswer(Answer);

                //setBotLoading(false);

            } else {
                console.error("Failed to fetch questions.");
                //handleFlashMessage("Failed to fetch questions. Please login again.", false);
            }
        } catch (error) {
            console.error("An error occurred while fetching questions:", error);
            //handleFlashMessage("Error: " + error, false);
        }
    };
    const getAnswersFromAPI = async (index) => {
        setQuestions([])
        setBotLoading(true);

        {
            const response = await fetch("/get_answers", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    questionIndex: index,
                }),
            });

            if (response.ok) {
                const Answer = await response.json();
                console.log(Answer)

                // Set the fetched questions into the state
                setAnswer(Answer);

                setBotLoading(false);
            }
        }
    };



    const fetchRelevantDoc = async (question) => {
        // Display loading view for the bot
        console.log("question ", question)
        setQuestions([])
        setNotfound([])
        setAnswer('')
        //setBotLoading(true);
        if (question === "") {
            setBotLoading(false);
            setNotfound(["please enter the question..."]);
            return;
        }

        try {
            const response = await fetch("/relevant_doc", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    selectedQuestion: question,
                }),
            });

            if (response.ok) {
                // Introduce a delay of 2 seconds
                // const predefinedQuestions = await response.json();
                // setQuestions(predefinedQuestions);
                setTimeout(async () => {
                    const data = await response.json();

                    if (typeof data === 'number') {
                        getAnswersFromAPI(data)
                    } else {
                        (data.length > 0) ? setQuestions(data)
                            : setNotfound(["question not found ...!", 'please try again another question.'])
                    }
                    // Hide the loading view for the bot after receiving the response
                    setBotLoading(false);
                }, 2000);
            }
        } catch (error) {
            // Handle error
            console.error("Error fetching relevant documents:", error);
            // Optionally, set an error state or display an error message
            // Hide the loading view for the bot in case of an error
            setBotLoading(false);
        }
    };



    const toggleChatBot = async () => {
        console.log("questions in data", aiQues)
        setShowChatBot(!showChatBot);
        fetchQuestionsFromAPI()

        try {
            // First, call the createUserDirectories route with the selected option
            const createUserResponse = await fetch("/assistantRoutes/createUserDirectory", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (!createUserResponse.ok) {
                throw new Error("Network response was not ok");
            }
            console.log('-----', createUserResponse.json().message)
            // Now, fetch the timestamp
            const timestampResponse = await fetch("/assistantRoutes/timestamps", {
                method: "POST",
            });

            if (!timestampResponse.ok) {
                throw new Error("Network response was not ok");
            }

            const timestampData = await timestampResponse.json();
            const timestamp = timestampData.timestamp;
            console.log('time stamp', timestamp)
        } catch (error) {
            console.error("Fetch error:", error);
        }
    };

    const handleSendClick = (e) => {
        e.preventDefault()
        if (inputValue.trim() !== '') {
            setSelectedQuestion(inputValue);
            fetchRelevantDoc(inputValue);
            setAiQues(aiQues, ...divlist);
            setInputValue('')
        }
    };
    const handlePreviousQues = () => {
        // Check if it's the first question; if so, set it to 1
        if (quesNumber <= 1) {
            setQuesNumber(1);
        } else {
            // Decrement the question number by 1
            setQuesNumber(quesNumber - 1);
        }
        // Hide feedback-related elements
        setShowFeedback(false);
        setShowGetFeedbackButton(false);
        // Clear the feedback history when moving to the previous question
        setFeedbackHistory([]);
        setSTTHistory([]);
        setAttemptNumber(0);
        setFeedbacksNumber(0);
        setToggleState("Expand");
    };

    const handleNextQues = async () => {
        // Increment the question number
        setQuesNumber(quesNumber + 1);
        setAudio(null); // Reset the audio state
        // Hide feedback-related elements
        setShowFeedback(false);
        setShowGetFeedbackButton(false);
        setToggleState("Expand");

        try {
            const response = await fetch("/assistantRoutes/chatreset", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
            });

            if (response.status === 200) {
                setFeedbackHistory([]);
                setSTTHistory([]);
                setAttemptNumber(0);
                setFeedbacksNumber(0);
            } else if (response.status === 401) {
                //handleFlashMessage("Unauthorized access. Please Login", false);
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            } else {
                console.error("Error resetting chat");
                //  handleFlashMessage("Error resetting chat.", false);
            }
        } catch (error) {
            console.error("Error occurred:", error);
            //  handleFlashMessage("Error occurred:" + error, false);
        }
    };


    const chatClear = () => {
        setShowConfirmation(true);
    };
    const handleClearChat = () => {
        setAiQues([]); // Clear chat content
        setSelectedQuestion([]);
        setAnswer([]);
        setQuestions([])
        setShowChatBot(false); // Hide chat bot
        setShowConfirmation(false); // Close confirmation popup
    };

    const handleCancelClear = () => {
        setShowConfirmation(false); // Close confirmation popup
    };

    const getMicrophonePermission = async () => {
        // Entering fullscreen mode


        if ("MediaRecorder" in window) {
            try {
                const streamData = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        noiseSuppression: true,
                        echoCancellation: true
                    },
                    video: false
                });
                setPermission(true);
                console.log("steram data", streamData)
                setStream(streamData);
            } catch (err) {
                console.log(err.message);
            }
        } else {
            console.log("The MediaRecorder API is not supported in your browser.");
        }

        // Start the timer when permission is granted and recording starts
        // if (permission && recordingStatus === "recording" && !timerIdRef.current) {
        //     timerIdRef.current = setInterval(() => {
        //         setRemainingTime((prevTime) => {
        //             if (prevTime <= 0) {
        //                 clearInterval(timerIdRef.current);
        //                 return 0;
        //             }
        //             return prevTime - 1;
        //         });
        //     }, 1000);
        // }
    };

    const startRecording = async () => {
        //Check if the maximum number of attempts is reached
        // if (attemptNumber > configData.MaxAttempts) {
        //     // handleFlashMessage("Max number of attempts reached", false);
        //     return;
        // }

        if (!permission) {
            if ("MediaRecorder" in window) {
                try {
                    var streamData = await navigator.mediaDevices.getUserMedia({
                        audio: {
                            noiseSuppression: true,
                            echoCancellation: true
                        },
                        video: false
                    });
                    setPermission(true);
                    setStream(streamData);
                    console.log("stream data is", streamData)
                } catch (err) {
                    console.log(err.message);
                }
            } else {
                console.log("The MediaRecorder API is not supported in your browser.");
            }
        }

        setRecordingStatus("recording");
        // setToggleState("Collapse");
        // setShowAudio(false);
        const media = new MediaRecorder(streamData, { type: mimeType });
        mediaRecorder.current = media;
        mediaRecorder.current.start();
        let localAudioChunks = [];
        mediaRecorder.current.ondataavailable = (event) => {
            if (typeof event.data === "undefined") return;
            if (event.data.size === 0) return;
            localAudioChunks.push(event.data);
        };
        setAudioChunks(localAudioChunks);
    };

    // Stop recording logic
    const stopRecording = async () => {
        setRecordingStatus("inactive");
        mediaRecorder.current.stop();
        mediaRecorder.current.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: mimeType });
            const audioUrl = URL.createObjectURL(audioBlob);
            const audioFile = new File([audioBlob], "Question.mp3"); // Change the file extension if needed
            setUploading(true);

            try {
                const formData = new FormData();
                formData.append("audio", audioFile);
                formData.append("quesNumber", 1); // Add quesNumber to the FormData
                const response = await axios.post("/assistantRoutes/upload-audio", formData, {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                });

                if (response.status === 200) {
                    setAudio(audioUrl);
                    setAudioChunks([]);
                    setUploading(false);
                    setSttLoading(true);
                    // setText("Transcribing..");

                    const response2 = await fetch("/assistantRoutes/stt", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ quesNumber: 1 }),
                    });

                    if (response2.status === 200) {
                        const data = await response2.json();
                        setSelectedQuestion(data[0]);

                    } else {
                        console.log("An error occurred while calling /stt");
                    }
                } else if (response.status === 401) {
                    // handleFlashMessage("User Session not found. Please login again.", false);
                    window.location.href = '/';
                } else {
                    console.error("Error uploading audio. Status:", response.status);
                    //handleFlashMessage("Error uploading audio. Status:" + response.status, false);
                }
            } catch (error) {
                console.error("Error uploading audio.", error);
                // handleFlashMessage("Error: " + error, false);
            }
        };
    };


    const audioFunction = async () => {
        if (recordingStatus === 'inactive') {
            startRecording();
        }
        else {
            stopRecording();
        }
    }



    var divlist = [];

    const chatBot = () => {
        // Only execute if showChatBot is true
        if (!showChatBot) return null;
        console.log("selected question is ", selectedQuestion)
        selectedQuestion && divlist.push(<div key={selectedQuestion} style={{
            backgroundColor: 'black',
            color: 'white',
            padding: '10px',
            borderRadius: '15px',
            maxWidth: '60%',
            display: 'flex',
            justifyContent: 'flex-end',
            marginBottom: '10px',
            alignSelf: 'flex-end',
            wordWrap: 'break-word',
        }}>{selectedQuestion} </div>);

        selectedQuestion || notfound.map((e, i) => {
            divlist.push(<div key={i} style={{
                backgroundColor: '#D1D1D1',
                color: 'black',
                padding: '10px',
                borderRadius: '15px',
                minWidth: '10%',
                maxWidth: '60%',
                marginBottom: '10px',
                wordWrap: 'break-word',
            }} >{e} </div>);
        });

        answer[quesNumber - 1] &&
            console.log("answer is", answer[quesNumber - 1])
        divlist.push(<div key={answer[quesNumber - 1]} style={{
            backgroundColor: '#D1D1D1',
            color: 'black',
            padding: '10px',
            borderRadius: '15px',
            minWidth: '10%',
            maxWidth: '60%',
            marginBottom: '10px',
            wordWrap: 'break-word',
        }} >{answer[quesNumber - 1]} </div>);

        questions.map((e, i) => {

            divlist.push(<div key={i} style={{
                backgroundColor: '#D1D1D1',
                color: 'black',
                padding: '10px',
                borderRadius: '15px',
                minWidth: '10%',
                maxWidth: '60%',
                marginBottom: '10px',
                wordWrap: 'break-word',
            }} onClick={(i) => { ref.current.value = Object.values(e)[0] }}>{Object.values(e)[0]} </div>);
        });

        aiQues = [...aiQues, ...divlist];
        return aiQues;
    };

    const ref = useRef();
    return (
        <div>
            <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-30%)', left: '400px' }}>
                {/* <button
                    type="button"
                    className={`group relative flex-grow py-2.5 px-2.5 mx-5 border border-transparent text-sm font-medium rounded-md ${(recordingStatus === "recording") ? 'bg-gray-300 text-black-500 cursor-not-allowed' : 'bg-customColor text-white hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white'}`}
                    onClick={handlePreviousQues}
                    disabled={quesNumber === 1 || recordingStatus === "recording"}
                >
                    &lt;&lt;
                </button> */}
            </div>
            <div style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                opacity: showChatBot ? '1' : '0',
                transition: 'opacity 0.5s',
                zIndex: '9999',
                boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.1)',
                background: "#DCE0E5",
                height: '450px',
                width: '400px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
            }}
            >

                <div style={{
                    background: '#8fa398',
                    padding: '10px',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center'
                }}>

                    <h2 style={{ margin: '0', textAlign: 'center', width: '80%', color: 'white' }}>Virtual Assistant</h2>
                    <div style={{ width: '20%', display: 'flex', justifyContent: 'space-around' }}>
                        <button
                            onClick={toggleChatBot}
                            style={{
                                position: 'relative',
                                top: '3px',
                                right: '9px',
                                backgroundColor: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                outline: 'none',
                                padding: '3px', // Added padding to make the button larger
                            }}
                        >
                            <span
                                style={{
                                    fontSize: '25px',
                                    color: 'white',
                                    cursor: 'pointer' // Add cursor pointer to indicate it's clickable
                                }}

                            >
                                -
                            </span>
                        </button>

                        {/* <div className="popup" onClick={chatClear}>
                            <span className="popuptext" id="myPopup">x</span>
                        </div> */}

                        <button
                            onClick={chatClear}
                            style={{
                                position: 'relative',
                                top: '3px',
                                right: '9px',
                                backgroundColor: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                outline: 'none',
                                padding: '3px', // Added padding to make the button larger
                            }}
                        >
                            <span
                                style={{
                                    fontSize: '25px',
                                    color: 'white',
                                    cursor: 'pointer' // Add cursor pointer to indicate it's clickable
                                }}
                                onMouseEnter={(e) => { e.target.style.color = 'red' }} // Change color on hover
                                onMouseLeave={(e) => { e.target.style.color = 'white' }} // Restore color on mouse leave
                            >
                                x
                            </span>
                        </button>
                    </div>
                </div>


                {/* ChatBot content */}
                <div
                    style={{
                        flex: 1, /* Added flex to grow */
                        width: '100%', /* Added width */
                        overflowY: 'auto',
                        backgroundColor: '#DCE0E5',
                        padding: '10px', /* Adjusted padding */
                        scrollbarWidth: 'thin', // For Firefox
                        scrollbarColor: 'rgba(0, 0, 0, 0.1) transparent', // For Firefox
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    {/* Render chatBot component */}
                    {showConfirmation && (
                        <div className="popup-container" style={{ marginRight: '0px', width: '600px', height: '400px' }}>
                            <div className="popup">
                                <div className="popuptext show">
                                    <p>Are you sure you want to end your chat?</p>
                                    <button onClick={handleClearChat} style={{ marginRight: '20px', background: 'linear-gradient(to right, #1488CC 50%, #2B32B2 50%)' }}>Yes</button>
                                    <button onClick={handleCancelClear} style={{ marginLeft: '20px', backgroundColor: '#1488CC' }}>No</button>
                                </div>

                            </div>
                        </div>



                    )}
                    {chatBot()}

                    {/* Loading animation */}
                    {aiQues !== null && botLoading && (
                        <div style={{ alignSelf: 'flex-start' }}>
                            <DotWave size={30} color="#8fa398" /> {/* Decreased loading animation size */}
                        </div>
                    )}

                    {/* Your main content goes here */}
                </div>

                {/* Input and send button */}
                {/* Input and send button */}
                <div>
                    <form style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }} onSubmit={handleSendClick}>
                        <div style={{ border: isFocused ? '2px solid #f15622' : 'none', background: 'white', height: '40px', width: '85%', display: 'flex', alignItems: 'center' }}>
                            <input
                                placeholder="Ask a Question"
                                type='text'
                                ref={ref}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                style={{
                                    flex: '1',
                                    height: '30px',
                                    width: '80%',
                                    backgroundColor: 'white',
                                    outline: 'none',
                                    fontSize: '15px',
                                    marginLeft: '20px'
                                }}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                disabled={recordingStatus === 'recording'}
                            />

                            <i className={recordingStatus === 'inactive' ? "fa fa-microphone" : "fa fa-microphone-slash"} onClick={audioFunction} style={{ fontSize: '20px', cursor: 'pointer', marginLeft: '8px', marginRight: '10px' }}></i>
                        </div>
                        <button
                            style={{
                                width: '15%',
                                height: '40px',
                                cursor: inputValue.trim() === '' || recordingStatus === 'recording' ? 'not-allowed' : 'pointer',
                                background: inputValue === '' ? 'white' : '#f15622'
                            }}
                            disabled={inputValue.trim() === '' || recordingStatus === 'recording'}
                            type="submit"
                        >
                            <i style={{ fontSize: '25px', lineHeight: '20px' }}>&#x27A4;</i>
                        </button>
                    </form>


                </div>


            </div>
            {/* {quesNumber === answer.length ? (
                <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-80%)', right: '400px' }}>
                    <button
                        type="button"
                        className={`group relative flex-grow py-2.5 px-2.5 mx-5 border border-transparent text-sm font-medium rounded-md ${(recordingStatus === "recording") ? 'bg-gray-300 text-black-500 cursor-not-allowed' : 'bg-customColor text-white hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white'}`}
                        onClick={"handlefinishQues"}
                        disabled={recordingStatus === "recording"}
                    >
                        Finish
                    </button>
                </div>
            ) : (
                <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-80%)', right: '400px' }}>
                    <button
                        type="button"
                        className={`group relative flex-grow py-2.5 px-2.5 mx-5 border border-transparent text-sm font-medium rounded-md ${(recordingStatus === "recording") ? 'bg-gray-300 text-black-500 cursor-not-allowed' : 'bg-customColor text-white hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white'}`}
                        onClick={handleNextQues}
                        disabled={recordingStatus === "recording"}
                    >
                        &gt;&gt;
                    </button>
                </div>
            )

            } */}
            {/* Button to toggle chat bot */}
            {/* {!showChatBot && (
                <button
                    onClick={toggleChatBot}
                    style={{
                        position: 'fixed',
                        bottom: '20px',
                        right: '20px',
                        zIndex: '9999',
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        outline: 'none',
                        backgroundColor: '#FF5F1F',
                        color: 'white',
                        border: 'none',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    Bot {/* Button text */}

        </div>
    );
}