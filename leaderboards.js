

// leaderboard.js
import dotenv from 'dotenv';
dotenv.config();

import { MongoClient } from 'mongodb';
import axios from 'axios';

const mongoUrl = process.env.MONGO_URL;




const client = new MongoClient(mongoUrl);

async function loadHandleMappingFromDB(client) {
    await client.connect();
    const collection = client.db('DevClub').collection('Members');
    
    const data = await collection.find({}).toArray();
    
    const handleMapping = {};
    data.forEach(row => {
        const codeforcesHandle = row['Codeforces Handle'];
        handleMapping[codeforcesHandle] = {
            discordUsername: row['Discord Username'],
            name: row.Name,
            semester: row.Semester
        };
    });
    return handleMapping;
}


async function createLeaderboardByContestId(contestId) {
    const handleMapping = await loadHandleMappingFromDB(client);
    try {
        const response = await axios.get(`https://codeforces.com/api/contest.standings`, {
            params: {
                contestId,
                handles: Object.keys(handleMapping).join(';'), // Pass handles directly
                showUnofficial: true
            }
        });

        const standings = response.data.result.rows;
        const constestName = response.data.result.contest.name;

        const leaderboard = standings.map((entry) => {
            const handle = entry.party.members[0].handle;
            const userInfo =  handleMapping[Object.keys(handleMapping).find(key => key.trim().toLowerCase() === handle.trim().toLowerCase())]


            return {
                rank: entry.rank,
                discordUsername: userInfo.discordUsername || 'Unknown User',
                handle,
                name: userInfo.name || 'N/A',
                semester: userInfo.semester || 'N/A',
                points: entry.points,
                penalty: entry.penalty
            };
        });
        // remove repeating users based on handle
        const newleaderb = leaderboard.filter((user, index, self) =>
            index === self.findIndex((t) => (
                t.handle === user.handle
            ))
        );
        // console.log(newleaderb);   

        newleaderb.unshift({ contestName: constestName });

        return newleaderb;
    } catch (error) {
        console.error('Error fetching contest standings:', error);
        throw new Error('Failed to generate leaderboard.');
    }
}


async function createLeaderboardByRatings() {
    
    const handleMapping = await loadHandleMappingFromDB(client);
    try {
        const handles = Object.keys(handleMapping).join(';');
        const response = await axios.get(`https://codeforces.com/api/user.info`, {
            params: {
                handles
            }
        });

        const userInfoList = response.data.result;

        const leaderboard = userInfoList.map((userInfo) => {
            const handle = userInfo.handle;
            const user = handleMapping[Object.keys(handleMapping).find(key => key.trim().toLowerCase() === handle.trim().toLowerCase())]

            
            return {
                discordUsername: user.discordUsername || 'Unknown User',
                handle,
                name: user.name || 'N/A',
                semester: user.semester || 'N/A',
                rating: userInfo.rating || 0,
                maxRating: userInfo.maxRating || 0
            };
        });
        //remove unrated
        const newleaderb = leaderboard.filter(user => user.rating > 0);

        // Sort by rating in descending order
        newleaderb.sort((a, b) => b.rating - a.rating);

        return newleaderb;
    } catch (error) {
        console.error('Error fetching user ratings:', error);
        throw new Error('Failed to generate ratings leaderboard.');
    }
}


async function createSemesterWiseLeaderboards() {
    const semesterWiseLeaderboards = {};
    const leaderboard = await createLeaderboardByRatings();
    leaderboard.forEach(user => {
        const semester = user.semester || 'Unknown';
        
        if (!semesterWiseLeaderboards[semester]) {
            semesterWiseLeaderboards[semester] = [];
        }

        semesterWiseLeaderboards[semester].push({
            discordUsername: user.discordUsername,
            handle: user.handle,
            name: user.name,
            semester,
            rating: user.rating,
            maxRating: user.maxRating
        });
    });

    return semesterWiseLeaderboards;

   
    // // Group users by semester
    // Object.entries(handleMapping).forEach(([handle, userInfo]) => {
    //     const semester = userInfo.semester || 'Unknown';
        
    //     if (!semesterWiseLeaderboards[semester]) {
    //         semesterWiseLeaderboards[semester] = [];
    //     }

    //     semesterWiseLeaderboards[semester].push({
    //         discordUsername: userInfo.discordUsername || 'Unknown User',
    //         handle,
    //         name: userInfo.name || 'N/A',
    //         semester
    //     });
    // });
}

export {
    createLeaderboardByContestId,
    createLeaderboardByRatings,
    createSemesterWiseLeaderboards,
    loadHandleMappingFromDB
}