import { useState, useCallback, useEffect } from "react";

interface UseSendbirdCallsProps {
  sb: any;
  user: any;
  channel: any;
  onMessageSent?: () => void; // 메시지 전송 후 콜백
}

export const useSendbirdCalls = ({ sb, user, channel, onMessageSent }: UseSendbirdCallsProps) => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [callType, setCallType] = useState<"voice" | "video" | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  // 브라우저 미디어 권한 확인 및 요청
  const requestMediaPermissions = async () => {
    try {
      console.log("미디어 권한 확인 중...");

      // 브라우저 지원 확인
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("이 브라우저는 미디어 장치를 지원하지 않습니다.");
      }

      // 오디오 권한 요청
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      console.log("오디오 권한 획득 성공");

      // 스트림 정리
      audioStream.getTracks().forEach((track) => track.stop());

      return true;
    } catch (error: any) {
      console.error("미디어 권한 요청 실패:", error);
      alert("마이크 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해주세요.");
      return false;
    }
  };

  // 기본 통화 SDK 초기화 (SendBird Calls SDK 제거)
  useEffect(() => {
    const initializeBasicCalls = async () => {
      try {
        console.log("=== 기본 통화 기능 초기화 시작 ===");

        // Step 1: 미디어 권한 먼저 확인
        const hasMediaPermission = await requestMediaPermissions();
        if (!hasMediaPermission) {
          console.error("미디어 권한이 없어 통화 기능을 초기화할 수 없습니다.");
          return;
        }

        console.log("=== 기본 통화 기능 초기화 완료 ===");
      } catch (error: any) {
        console.error("기본 통화 기능 초기화 실패:", error);
        console.error("오류 상세:", {
          message: error?.message || "알 수 없는 오류",
          stack: error?.stack,
          name: error?.name,
        });
      }
    };

    if (user) {
      console.log("사용자 정보 확인됨, 기본 통화 기능 초기화 시작:", user.userId);
      initializeBasicCalls();
    } else {
      console.log("사용자 정보가 없어 기본 통화 기능 초기화를 건너뜁니다.");
    }
  }, [user, channel]);

  // 통화 시작 (음성) - 기본 WebRTC 사용
  const startVoiceCall = useCallback(async () => {
    if (!channel || !user) {
      alert("채널에 입장하지 않았습니다.");
      return;
    }

    try {
      console.log("음성 통화 시작 (기본 WebRTC)...");

      // 미디어 스트림 가져오기
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      setLocalStream(stream);
      setIsCallActive(true);
      setCallType("voice");

      console.log("음성 통화 시작됨");
      alert("음성 통화가 시작되었습니다. (기본 WebRTC 모드)");
    } catch (error) {
      console.error("음성 통화 시작 실패:", error);
      alert("통화를 시작할 수 없습니다. 마이크 권한을 확인해주세요.");
    }
  }, [channel, user]);

  // 통화 시작 (영상) - 현재 사용하지 않음
  const startVideoCall = useCallback(async () => {
    if (!channel || !user) {
      alert("채널에 입장하지 않았습니다.");
      return;
    }

    // 현재는 통화 기능이 미구현 상태
    alert("영상 통화 기능은 현재 개발 중입니다.");
    console.log("영상 통화 기능 미구현");
  }, [channel, user]);

  // 통화 종료
  const endCall = useCallback(async () => {
    try {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        setLocalStream(null);
      }

      setIsCallActive(false);
      setCallType(null);
      setCallDuration(0);

      console.log("통화 종료 완료");
    } catch (error) {
      console.error("통화 종료 실패:", error);
    }
  }, [localStream]);

  // 녹음 시작
  const startRecording = useCallback(async () => {
    try {
      console.log("녹음 시작...");

      // 미디어 스트림 가져오기
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      // MediaRecorder 설정
      const recorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        console.log("녹음 완료, 파일 생성 중...");

        // 녹음된 데이터를 Blob으로 생성
        const audioBlob = new Blob(chunks, { type: "audio/webm" });

        // 오디오 파일 생성
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const fileName = `녹음_${timestamp}.webm`;

        // File 객체 생성
        const audioFile = new File([audioBlob], fileName, {
          type: "audio/webm",
          lastModified: Date.now(),
        });

        console.log("녹음 파일 생성됨:", fileName, audioFile.size, "bytes");

        // 채팅 메시지로 자동 업로드
        if (channel && user) {
          try {
            console.log("녹음 파일을 채팅 메시지로 업로드 중...");

            // SendBird 파일 메시지 전송
            const params = new sb.FileMessageParams();
            params.file = audioFile;
            params.fileName = fileName;
            params.fileSize = audioFile.size;
            params.mimeType = "audio/webm";

            channel.sendFileMessage(params, (message: any, error: any) => {
              if (error) {
                console.error("녹음 파일 업로드 실패:", error);
                alert("녹음 파일 업로드에 실패했습니다: " + error.message);
              } else {
                console.log("녹음 파일 업로드 성공:", message);
                alert("녹음 파일이 채팅에 업로드되었습니다!");

                // 메시지 전송 후 콜백 호출 (메시지 목록 새로고침)
                if (onMessageSent) {
                  console.log("메시지 전송 콜백 호출");
                  setTimeout(() => {
                    onMessageSent();
                  }, 100); // 약간의 지연 후 콜백 호출
                }
              }
            });
          } catch (uploadError) {
            console.error("녹음 파일 업로드 중 오류:", uploadError);
            alert("녹음 파일 업로드 중 오류가 발생했습니다.");
          }
        } else {
          console.error("채널 또는 사용자 정보가 없어 녹음 파일을 업로드할 수 없습니다.");
          alert("채널에 입장하지 않아 녹음 파일을 업로드할 수 없습니다.");
        }

        // 스트림 정리
        stream.getTracks().forEach((track) => track.stop());
      };

      // 녹음 시작
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);

      console.log("녹음 시작됨");
    } catch (error) {
      console.error("녹음 시작 실패:", error);
      alert("녹음을 시작할 수 없습니다. 마이크 권한을 확인해주세요.");
    }
  }, [channel, user, sb, onMessageSent]);

  // 녹음 중지
  const stopRecording = useCallback(async () => {
    try {
      console.log("녹음 중지...");

      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
        setIsRecording(false);
        console.log("녹음 중지됨");
      } else {
        console.warn("녹음기가 활성화되지 않았습니다.");
        setIsRecording(false);
      }
    } catch (error) {
      console.error("녹음 중지 실패:", error);
      setIsRecording(false);
    }
  }, [mediaRecorder]);

  // 통화 시간 업데이트
  useEffect(() => {
    let interval: number;

    if (isCallActive) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isCallActive]);

  return {
    isCallActive,
    callType,
    localStream,
    isRecording,
    callDuration,
    startVoiceCall,
    startVideoCall,
    endCall,
    startRecording,
    stopRecording,
  };
};
