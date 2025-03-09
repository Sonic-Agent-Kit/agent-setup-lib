import { Member } from "../agent.service"

export async function superviso_prompt(members:Array<Member>, system_prompt?:string){
    
    const classification = members.map(member => {
        return `- ${member.name} Operations include \n` + member.classification?.join('\n')
    })
    
    let prompt = 
    `You are a supervisor tasked with managing a conversation between the` +
    ` following workers:  {team_members}. Given the following user request,` +
    ` respond with the worker to act next. Each worker will perform a` +
    ` task and respond with their results and status. When finished,` +
    ` respond with FINISH.\n\n` +
    ` Select strategically to minimize the number of steps taken. \n\n` + 
    
        `Workers Classification Guidelines:\n\n` + 
        `${classification.join("\n\n")}`

    if(system_prompt){
        prompt = prompt + "\n\n" + system_prompt  
    }
    
    return prompt
}