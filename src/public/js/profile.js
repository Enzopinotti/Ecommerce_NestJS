import { showProfile } from "../../controllers/user.controller";

fetch('/api/profile',{
    method: 'GET',
    headers: {
        'authorization': `Barer ${localStorage.getItem('token')}`,
    }
}).then(response =>{
    if(response.status === 401){
        window.location.replace('/login')
    }else{
        return response.json();
    }
}).then(json=>{
    showProfile(json);
})