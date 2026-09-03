
//calculates issue priority dynamic score based on severity , recurrence and safety implicataions



export const DEFAULT_WEIGHTS={
    severity:0.40,
    recurrence:0.20,
    trafficImpact:0.15,
    roadImportance:0.15,
    safetyImpact:0.10,
};

const getSeverityScore=(severity)=> {
    switch(severity?.toUpperCase()){
        case 'CRITICAL':
            return 100;
        case 'HIGH':
            return 75;
         case 'MEDIUM':
         return 50;
         case 'LOW':  
         return 25;
         default :
         return 0;     
    }
};

const getRecurrenceScore=(observationCount=1,busCount=1)=>
{
    let baseScore=20;

    if(observationCount>=5)
        baseScore=100;
    else if(observationCount==4)
        baseScore=80;
    else if(observationCount==3)
        baseScore=60;
    else if(observationCount==2)
        baseScore=40;
  

    if(busCount>1){
        baseScore=Math.min(100,baseScore+(busCount-1)*10);

    }
    return baseScore;
};

const getTrafficImpactScore=(trafficImpact)=>{
    switch(trafficImpact?.toUpperCase()){
        
        case 'SEVERE':
        return 100;
        case 'HIGH':
            return 75;
        case 'MEDIUM':
            return 50;
        case 'LOW':
            return 25;
        default:
            return 50;
    }
}
  
const getRoadImportanceScore=(roadImportance)=>{
    switch(roadImportance?.toUpperCase()){
        case 'CRITICAL':
            case 'EXPRESSWAY':
            return 100;
            case 'HIGH':
                case 'ARTERIAL':
                return 75;
                case 'MEDIUM':
                    case 'COLLECTOR':
                    return 50;
                    case 'LOW':
                        case 'LOCAL':
                        return 25;

                        default:
                            return 50;
    }
};

const getSafetyImpactScore=(issueType)=>{
    switch(issueType?.toUpperCase()){
        case 'POTHOLE':
            return 95;
        case 'WATERLOGGING':
            return 85;

            case 'STREETLIGHT_FAULT':
                return 80;
                case 'ROAD_CRACK':
                    return 60;
                    case 'GARBAGE_ACCUMULATION':
                        return 40;
                         default:
                            return 50;
    }
}

//MAIN PRIORITY CALCULATION FUNCTION

const calculatePriority=(issue,roadSegment=null,customWeights={})=>{
    const weights={...DEFAULT_WEIGHTS,...customWeights};


const severityScore= getSeverityScore(issue.severity);
const recurrenceScore=getRecurrenceScore(issue.observationCount, issue.busCount);
  const trafficImpactScore = getTrafficImpactScore(
    roadSegment?.trafficImpact || issue.metadata?.trafficImpact
  );
  const roadImportanceScore = getRoadImportanceScore(
    roadSegment?.importance || issue.metadata?.roadImportance
  );
  const safetyImpactScore = getSafetyImpactScore(issue.type);
const rawScore =
    severityScore * weights.severity +
    recurrenceScore * weights.recurrence +
    trafficImpactScore * weights.trafficImpact +
    roadImportanceScore * weights.roadImportance +
    safetyImpactScore * weights.safetyImpact;
  const score = Math.min(100, Math.max(0, Math.round(rawScore)));
  // 3. Map score to Priority Level
  let level = 'LOW';
  if (score > 80) {
    level = 'CRITICAL';
  } else if (score > 60) {
    level = 'HIGH';
  } else if (score > 30) {
    level = 'MEDIUM';
  } else {
    level = 'LOW';
  }
  return {
    score,
    level,
  };
};

const calculateIssuePriority = (issueData, roadSegment = null, customWeights = {}) => {
  return calculatePriority(issueData, roadSegment, customWeights);
};
export { calculatePriority, calculateIssuePriority };