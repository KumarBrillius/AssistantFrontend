import './../../App.css';
import { Routes,BrowserRouter,Route, } from "react-router-dom";
import ChatBot from './../../AssistantFrontend/Ui/Pages/Chatbot';


function Usecase2() {
    return (
        // <div className="min-h-full h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        //     <div className="max-w-md w-full space-y-8">
        <div>
                <BrowserRouter>
                    <Routes>
                        <Route path="/assistantRoutes/assistant" element={<ChatBot />} />
                    </Routes>
                </BrowserRouter>
            </div>
        // </div>
    );
}

export default Usecase2;