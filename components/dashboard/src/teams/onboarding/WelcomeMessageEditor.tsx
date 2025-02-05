/**
 * Copyright (c) 2025 Gitpod GmbH. All rights reserved.
 * Licensed under the GNU Affero General Public License (AGPL).
 * See License.AGPL.txt in the project root for license information.
 */

import { PlainMessage } from "@bufbuild/protobuf";
import type { OnboardingSettings_WelcomeMessage } from "@gitpod/public-api/lib/gitpod/v1/organization_pb";
import { Textarea } from "@podkit/forms/TextArea";
import { FormEvent, useCallback, useState } from "react";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../components/Modal";
import { InputField } from "../../components/forms/InputField";
import { TextInput } from "../../components/forms/TextInputField";
import { gitpodWelcomeSubheading } from "../TeamOnboarding";
import { Button } from "@podkit/buttons/Button";
import { LoadingButton } from "@podkit/buttons/LoadingButton";
import { OrgMemberAvatarInput } from "./OrgMemberAvatarInput";

type Props = {
    settings: OnboardingSettings_WelcomeMessage | undefined;
    isLoading: boolean;
    isOwner: boolean;
    isOpen: boolean;
    handleUpdateWelcomeMessage: (newSettings: PlainMessage<OnboardingSettings_WelcomeMessage>) => Promise<void>;
    setIsOpen: (isOpen: boolean) => void;
};
export const WelcomeMessageEditorModal = ({
    isLoading,
    isOwner,
    settings,
    isOpen,
    handleUpdateWelcomeMessage,
    setIsOpen,
}: Props) => {
    const [message, setMessage] = useState<string | undefined>(settings?.message);
    const [featuredMemberId, setFeaturedMemberId] = useState<string | undefined>(settings?.featuredMemberId);

    const updateWelcomeMessage = useCallback(
        async (e: FormEvent) => {
            e.preventDefault();
            await handleUpdateWelcomeMessage({
                message,
                featuredMemberId,
                enabled: settings?.enabled ?? false,
            });
        },
        [handleUpdateWelcomeMessage, message, featuredMemberId, settings?.enabled],
    );

    return (
        <Modal onClose={() => setIsOpen(false)} visible={isOpen} containerClassName="min-[576px]:max-w-[650px]">
            <ModalHeader>Edit welcome message</ModalHeader>
            <ModalBody>
                <form id="welcome-message-editor" onSubmit={updateWelcomeMessage} className="space-y-4">
                    <TextInput readOnly value="Welcome to Gitpod" className="cursor-default"></TextInput>
                    <Textarea value={gitpodWelcomeSubheading} readOnly className="cursor-default resize-none" />
                    <div className="w-full flex justify-center">
                        <OrgMemberAvatarInput settings={settings} setFeaturedMemberId={setFeaturedMemberId} />
                    </div>
                    <InputField label="Welcome message" error={undefined} className="mb-4" labelHidden>
                        <Textarea
                            className="bg-pk-surface-secondary text-pk-content-primary w-full p-4 rounded-xl min-h-[150px]"
                            value={message}
                            placeholder="Write a welcome message to your organization members. Markdown formatting is supported."
                            onChange={(e) => setMessage(e.target.value)}
                        />
                    </InputField>
                </form>
            </ModalBody>
            <ModalFooter>
                <Button variant="secondary" onClick={() => setIsOpen(false)}>
                    Cancel
                </Button>
                <LoadingButton type="submit" loading={isLoading} disabled={!isOwner} form="welcome-message-editor">
                    Save
                </LoadingButton>
            </ModalFooter>
        </Modal>
    );
};
